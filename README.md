# TierBridge

Verified jobs and a free 3-minute daily brief for Indian engineering students, built per branch (CSE, IT, ECE, MECH, CIVIL, BCA, MCA).

## What's here

- **Website** (`app/`, `components/site/`): the marketing site with a three.js hero, an interactive daily-brief preview, verified jobs, the semester learning path, partner and pricing sections, and a waitlist signup.
- **Waitlist API** (`app/api/waitlist`): saves email and branch to Supabase using a server-only key.
- **Content** (`content/`): `site.ts` holds the sample brief, jobs and paths shown until the daily pipeline is live. `playbooks.json` and `legacy-tracks.ts` keep the interview playbooks and roadmaps from the first version for later use.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and service role key
npm run dev                  # http://localhost:3000
```

## Supabase setup

Run `supabase/migrations/001_waitlist.sql` in the Supabase SQL editor. Row level security is on with no policies, so only the server can read or write the waitlist.

## Coming next

1. Daily brief pipeline: fetch news and jobs, summarize with Claude, email and WhatsApp at 7 AM.
2. Admin panel: review the day's brief, jobs and affiliate picks; see subscribers and clicks.
3. Verified job board with featured posts, then Pro.
