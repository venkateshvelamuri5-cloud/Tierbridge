// Public connection details. The anon key is meant to be public:
// every table is protected by row level security in the database.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twwoctrjsrztlbazildl.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3d29jdHJqc3J6dGxiYXppbGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NTA0NzgsImV4cCI6MjExMDMyNjQ3OH0.NP_Iz3LMiWJWau4yw0dL_MThj2-SSeCcL2fCgdGbTy0';

// Logins are stored as email addresses behind the scenes. These are not real mailboxes.
export const loginEmail = (slug: string, loginId: string) =>
  `${loginId.trim().toLowerCase()}@${slug}.tierbridge-login.example.com`;
export const PLATFORM_SLUG = 'platform';
export const BUCKET = 'tb-files';
export const PRICE_PER_FLAT = 50;

// How societies pay Kasha Tech Solutions for Tierbridge during the pilot.
// Fill these in so the upgrade screen shows them.
export const BILLING = {
  upiId: '',          // e.g. 'kashatech@okaxis'
  payeeName: 'Kasha Tech Solutions',
  whatsapp: '',       // e.g. '9876543210', for upgrade questions
};
