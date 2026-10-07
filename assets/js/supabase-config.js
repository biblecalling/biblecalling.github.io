/**
 * Jesus Calling - Supabase Public Client Configuration
 *
 * NOTE: The Supabase URL and Anon Key are explicitly designed by Supabase
 * to be safe for public frontend browsers. All security and data access
 * is strictly enforced on the database through PostgreSQL Row-Level Security (RLS).
 *
 * Never place your 'service_role' secret key here.
 * For setup instructions, see COMMENT_SYSTEM_SETUP.md.
 */

window.JESUS_CALLING_CONFIG = {
  // Replace these with your Supabase project details from your Supabase Dashboard -> Settings -> API
  supabaseUrl: "https://xyzcompany.supabase.co", // e.g. "https://abcdefghijklmnopqrst.supabase.co"
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_setup", // your anon public key

  // Comment Settings (Pre-moderation enabled by default for safety)
  autoApproveComments: false, // Set to false so new reflections require approval before public display
  maxCommentLength: 1000,
  cooldownSeconds: 15,
  maxReplyDepth: 2, // 1 = top-level only, 2 = allow 1 level of nested replies

  // Site Base URL for OAuth redirects
  siteUrl: window.location.origin
};
