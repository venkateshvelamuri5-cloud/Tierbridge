# Tierbridge

Maintenance tracking for apartment societies, by Kasha Tech Solutions. Residents pay by UPI and mark it with the reference number, admins verify it, every expense carries its bill, and everyone in the building sees the same numbers.

## What's in it

**For residents and society admins** (`/<society>`, e.g. `/swarna-sai-nivas`)

| Page | What it does |
| --- | --- |
| Home | The building drawn floor by floor, each flat lit when it has paid; fund balance; spending by category; 6-month chart; notices |
| Pay | UPI ID, QR code and "Open UPI app" for the flat's amount; mark a month paid with UTR, date and optional screenshot |
| Payments | Every flat's status for a month. Admins verify, mark not received with a reason, record cash, edit |
| Expenses | Approved spending with bills (a bill is required when an admin adds one). Residents submit expenses for approval |
| Pending dues | Unpaid flats and amounts, with WhatsApp reminders per flat and for the group |
| Statement | Monthly statement: print or save as PDF, download CSV, share on WhatsApp |
| Notices | Admins post, pin, set an expiry, attach a photo or PDF, and see who has read each notice |
| Complaints | Issues (visible to all residents) and private grievances (optionally anonymous), with replies and status |
| Residents | Owners and tenants with names and phone numbers (visibility set per society); create logins in bulk; reset passwords; make admins; mark flats rented |
| Activity log | Admin-only, append-only history of every change |
| Settings | Maintenance amounts (per month, optionally per flat plan), UPI details, QR, opening balance, phone visibility, and the Tierbridge plan and how to upgrade |

**For the Tierbridge team** (`/admin`)

- Societies: status (trial, paid, read-only), trial end or paid-until dates, logins signed in, payments in the last 30 days, last activity, admins and their phones; filters for trials ending this week and renewals.
- New society: pick one of 10 building templates (or custom), adjust blocks, floors, flats per floor, numbering and plans, and create it with a 30-day trial. Optionally save the layout as a new template.
- Society detail: extend the trial, set a custom price (per-flat price, discount, or fixed yearly amount; 1 to 3 years), record a payment, create logins, make owners admins.
- Registrations from the home page form, with status and notes.
- Console log of every console action.

**Trial and read-only.** A society is free for 30 days from creation. After the trial, or after a subscription lapses, it becomes read-only: everyone can still see everything, but nothing new can be added until it is paid. Nothing is ever deleted.

## How it's built

- Next.js 14 (App Router) and TypeScript. All pages are client components that talk to Supabase directly.
- Supabase: Postgres, Auth and Storage. Everything lives in the `tb` schema; the original Swarna Sai Nivas app's tables in `public` are untouched.
- **Security is in the database.** Row level security and triggers decide who can see and change what, so the browser can't bypass the rules. The anon key in `lib/config.ts` is public by design.
- Logins: `101-owner` on `/swarna-sai-nivas` is stored as `101-owner@swarna-sai-nivas.tierbridge-login.example.com`. These are not real mailboxes. Public sign-up is turned off in Supabase; logins are created only by `tb.create_logins`.

## Setup

1. **Database:** run `supabase/migrations/001_society_platform.sql` in the Supabase SQL editor, then add `tb` under Project Settings → Data API → Exposed schemas.
2. **Tierbridge team login:** create it with `tb.make_auth_user('superadmin@platform.tierbridge-login.example.com', '<password>')` and insert the returned id into `tb.platform_admins`.
3. **Billing details:** set `BILLING.upiId` and `BILLING.whatsapp` in `lib/config.ts` so society admins see how to pay.
4. **Vercel:** import the repo (framework Next.js, no environment variables needed) and deploy.

## Development

```
npm install
npm run dev
```
