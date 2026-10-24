# TierBridge

Verified fresher jobs and a free 3-minute daily brief for Indian engineering students, written per branch (ECE, MECH, CIVIL, and CSE for CSE/IT/BCA/MCA).

## How it works

Every morning, with no one touching it:

| Time (IST) | What happens | Code |
|---|---|---|
| ~4:30 AM | **Jobs:** reads each company board in *Job sources* (Greenhouse, Lever, Ashby public APIs), keeps India/remote roles, asks Claude which are fresher roles and for which branches, adds new ones, closes ones that disappeared. | `lib/server/pipeline/jobs.ts` |
| right after | **News:** pulls the RSS feeds in `content/sources.ts` for each branch. | `lib/server/pipeline/news.ts` |
| right after | **Briefs:** Claude writes one draft per branch: a 5-minute skill with a free resource (the link is checked), 3 news stories chosen from the feeds, and a scam note. The pipeline attaches the top live jobs, the affiliate offer that best matches the skill, and any sponsor booked for that day. | `lib/server/pipeline/briefs.ts` |
| 7:00 AM | **Send:** emails each approved brief to its branch's subscribers through Resend, with tracked links and one-click unsubscribe. | `lib/server/pipeline/send.ts` |

Both runs are Vercel Cron jobs in `vercel.json` (times are UTC). On the Hobby plan Vercel may start a cron any time within its hour.

**Hands-on or passive.** By default you approve each brief and each new job in the admin panel. Set `AUTO_SEND_DRAFTS=true` and `AUTO_APPROVE_JOBS=true` to let it run on its own.

## Admin panel (`/admin`)

- **Today:** subscribers per branch, clicks, today's four briefs, buttons to run any step by hand, and a setup checklist.
- **Brief editor:** edit any part, preview the real email, send yourself a test, approve, send now, skip, or have Claude rewrite it.
- **Jobs:** approve or reject new roles, feature a role for 7 days (for paid listings), close roles, add a job by hand, manage job sources.
- **Affiliate offers:** your affiliate links with skill tags; the brief picks the best match each day. Shows clicks.
- **Sponsors:** book a sponsor for a branch and date range. Shows clicks.
- **Scam reports:** reports from `/report`. Publishing one feeds the next day's scam note.

Sign-in uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` with a signed, httpOnly session cookie. Middleware and every server action check it.

## Public site

`/` home (live jobs replace the samples once there are some), `/jobs`, `/briefs` archive, `/report`, `/unsubscribe`, `/privacy`. Links in emails and on the jobs page go through `/go`, which logs the click and redirects to a URL looked up from the database.

## Setup

1. **Supabase:** create a project, then run `supabase/migrations/001_waitlist.sql` and `002_platform.sql` in the SQL editor. RLS is on with no policies, so only the server can read or write.
2. **Resend:** add and verify your sending domain, create an API key.
3. **Anthropic:** create an API key at console.anthropic.com.
4. **Vercel:** add every variable in `.env.example`, deploy. Crons start on the next production deploy.
5. In `/admin`, add a few job sources and affiliate offers, then press **Refresh jobs**, **Fetch news** and **Draft briefs** to see the first drafts.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

To trigger a cron locally: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/daily`.

## Content

`content/site.ts` holds the sample brief and jobs shown on the home page. `content/sources.ts` lists news feeds and how subscriber branches map to briefs. `playbooks.json` and `legacy-tracks.ts` keep the interview playbooks and roadmaps from the first version.
