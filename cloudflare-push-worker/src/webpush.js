/**
 * Web Push Protocol Implementation for Cloudflare Workers
 * Compliant with RFC 8291 (Message Encryption) and RFC 8292 (VAPID)
 * Pure Web Crypto API (crypto.subtle) - Zero heavy Node dependencies.
 */

// Base64URL encoding/decoding utilities
export function base64UrlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str) {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert raw 32-byte base64url private key or JWK to CryptoKey for ECDSA P-256 signing
async function importVapidPrivateKey(privateKeyBase64Url, publicKeyBase64Url) {
  // 1. If in JWK JSON format already
  if (typeof privateKeyBase64Url === 'string' && privateKeyBase64Url.startsWith('{')) {
    const jwk = JSON.parse(privateKeyBase64Url);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  // 2. If publicKeyBase64Url is provided (standard output of `web-push generate-vapid-keys`)
  // Extract public coordinates x and y from the 65-byte uncompressed public key point (0x04 || x || y)
  if (publicKeyBase64Url) {
    try {
      const pubBytes = base64UrlDecode(publicKeyBase64Url);
      if (pubBytes.length === 65 && pubBytes[0] === 0x04) {
        const xBytes = pubBytes.slice(1, 33);
        const yBytes = pubBytes.slice(33, 65);
        const jwk = {
          kty: 'EC',
          crv: 'P-256',
          d: privateKeyBase64Url,
          x: base64UrlEncode(xBytes),
          y: base64UrlEncode(yBytes)
        };
        return await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['sign']
        );
      }
    } catch (e) {
      // Fall through to PKCS#8 DER attempt
    }
  }

  // 3. Fallback: Convert raw 32-byte scalar 'd' to standard PKCS#8 DER format (RFC 5915 / RFC 5208)
  const dBytes = base64UrlDecode(privateKeyBase64Url);
  const pkcs8Header = new Uint8Array([
    0x30, 0x77, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x5d, 0x30, 0x5b, 0x02, 0x01,
    0x01, 0x04, 0x20
  ]);

  if (dBytes.length === 32) {
    const der = new Uint8Array(pkcs8Header.length + 32);
    der.set(pkcs8Header, 0);
    der.set(dBytes, pkcs8Header.length);

    try {
      return await crypto.subtle.importKey(
        'pkcs8',
        der,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
    } catch (e) {
      // Fallback
    }
  }

  throw new Error('Unable to import VAPID private key. Ensure both public and private keys are valid Base64URL.');
}

// Generate RFC 8292 VAPID Authorization header
export async function createVapidAuthHeader({ endpoint, vapidPublicKey, vapidPrivateKey, vapidSubject }) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12 hours
    sub: vapidSubject
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importVapidPrivateKey(vapidPrivateKey, vapidPublicKey);
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signature = base64UrlEncode(signatureBuffer);
  const jwt = `${unsignedToken}.${signature}`;

  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

// RFC 8291 AES-128-GCM Payload Encryption
export async function encryptPayload({ clientP256dh, clientAuth, payloadText }) {
  const clientPublicKeyBytes = base64UrlDecode(clientP256dh);
  const clientAuthBytes = base64UrlDecode(clientAuth);
  const payloadBytes = new TextEncoder().encode(payloadText);

  // 1. Generate local ephemeral ECDH keypair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // 2. Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Derive shared ECDH secret (32 bytes)
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    localKeyPair.privateKey,
    256
  );

  // 4. Generate random 16-byte salt
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // 5. Derive IKM using HKDF with clientAuth as salt
  const authKey = await crypto.subtle.importKey('raw', clientAuthBytes, 'HKDF', false, ['deriveBits']);

  // Info for IKM: "WebPush: info" || 0x00 || client_pub || local_pub
  const ikmInfo = new Uint8Array(19 + 65 + 65);
  ikmInfo.set(new TextEncoder().encode('WebPush: info\0'), 0);
  ikmInfo.set(clientPublicKeyBytes, 14);
  ikmInfo.set(localPublicKeyBytes, 14 + 65);

  const ikmBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuthBytes, info: ikmInfo },
    authKey,
    256
  );

  // 6. Derive CEK and Nonce using salt and IKM
  const prkKey = await crypto.subtle.importKey('raw', ikmBits, 'HKDF', false, ['deriveBits', 'deriveKey']);

  // CEK Info: "Content-Encoding: aes128gcm" || 0x00
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: cekInfo },
    prkKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  // Nonce Info: "Content-Encoding: nonce" || 0x00
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfo },
    prkKey,
    96 // 12 bytes
  );
  const nonce = new Uint8Array(nonceBits);

  // 7. Pad plaintext with delimiter 0x02 (record padding delimiter for final record)
  const paddedRecord = new Uint8Array(payloadBytes.length + 1);
  paddedRecord.set(payloadBytes, 0);
  paddedRecord[payloadBytes.length] = 0x02;

  // 8. Encrypt padded record with AES-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cekKey,
    paddedRecord
  );
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  // 9. Construct RFC 8291 header
  // Salt (16B) + Record Size (4B: 4096 = 0x00001000) + Key Length (1B: 65) + Local PubKey (65B)
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65;
  header.set(localPublicKeyBytes, 21);

  // Concatenate header + ciphertext
  const body = new Uint8Array(header.length + ciphertextBytes.length);
  body.set(header, 0);
  body.set(ciphertextBytes, header.length);

  return body;
}

// Full Web Push sender function
export async function sendWebPushNotification({
  subscription,
  payload,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject
}) {
  const encryptedBody = await encryptPayload({
    clientP256dh: subscription.p256dh,
    clientAuth: subscription.auth,
    payloadText: JSON.stringify(payload)
  });

  const authHeader = await createVapidAuthHeader({
    endpoint: subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject
  });

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'normal'
    },
    body: encryptedBody
  });

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  };
}
