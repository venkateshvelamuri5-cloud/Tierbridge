import 'server-only'
import { siteUrl } from '@/lib/siteUrl'
import { db, type BriefRow, type JobRow, type OfferRow, type SponsorRow } from './db'

export type BriefBundle = { brief: BriefRow; jobs: JobRow[]; offer: OfferRow | null; sponsor: SponsorRow | null }

export async function loadBundle(brief: BriefRow): Promise<BriefBundle> {
  const sb = db()
  const [jobs, offer, sponsor] = await Promise.all([
    brief.job_ids.length ? sb.from('jobs').select('*').in('id', brief.job_ids).then(r => (r.data ?? []) as JobRow[]) : Promise.resolve([]),
    brief.affiliate_offer_id ? sb.from('affiliate_offers').select('*').eq('id', brief.affiliate_offer_id).maybeSingle().then(r => r.data as OfferRow | null) : Promise.resolve(null),
    brief.sponsor_id ? sb.from('sponsors').select('*').eq('id', brief.sponsor_id).maybeSingle().then(r => r.data as SponsorRow | null) : Promise.resolve(null),
  ])
  // Keep the order the brief chose, and drop jobs that closed since.
  const ordered = brief.job_ids.map(id => jobs.find(j => j.id === id)).filter((j): j is JobRow => !!j && j.status === 'live')
  return { brief, jobs: ordered, offer, sponsor }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const go = (briefId: number, kind: string, i: number | string) => siteUrl(`/go?b=${briefId}&k=${kind}&i=${i}`)

const BRANCH_LABEL: Record<string, string> = { ECE: 'ECE', MECH: 'Mechanical', CIVIL: 'Civil', CSE: 'CSE / IT' }

function section(title: string, body: string): string {
  return `<tr><td style="padding:22px 28px 0"><div style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#8a6200;margin-bottom:10px">${esc(title)}</div>${body}</td></tr>`
}

// Renders one brief as an email. `unsubscribeUrl` is per subscriber; previews pass '#'.
export function renderBrief({ brief, jobs, offer, sponsor }: BriefBundle, unsubscribeUrl: string): { subject: string; html: string; text: string } {
  const b = brief
  const p = 'margin:0 0 8px;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#2b3345'
  const h = 'margin:0 0 6px;font:700 17px/1.3 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#121826'
  const a = 'color:#0b6b8a;font-weight:600'

  const parts: string[] = []
  parts.push(section("Today's 5-minute skill", `
    <p style="${h}">${esc(b.skill.title)}</p>
    <p style="${p}">${esc(b.skill.detail)}</p>
    ${b.skill.resource_url ? `<p style="${p}">Free resource: <a style="${a}" href="${go(b.id, 'skill', 0)}">${esc(b.skill.resource_name)}</a></p>` : ''}
    ${offer ? `<p style="${p};font-size:13px;color:#5d6780">Want to go deeper? <a style="${a}" href="${go(b.id, 'affiliate', offer.id)}">${esc(offer.title)}</a>${offer.price_note ? ` (${esc(offer.price_note)})` : ''}. <i>Affiliate link: we may earn a small commission at no cost to you.</i></p>` : ''}`))

  if (b.news.length) {
    parts.push(section('News that matters to you', b.news.map((n, i) => `
      <p style="${h};font-size:15px"><a style="color:#121826;text-decoration:none" href="${go(b.id, 'news', i)}">${esc(n.title)}</a></p>
      <p style="${p}">${esc(n.why)} <span style="color:#7a849b;font-size:13px">${esc(n.source)}</span></p>`).join('<div style="height:8px"></div>')))
  }

  if (jobs.length) {
    parts.push(section('Verified jobs', jobs.map(j => `
      <p style="${h};font-size:15px"><a style="color:#121826;text-decoration:none" href="${go(b.id, 'job', j.id)}">${esc(j.title)}</a></p>
      <p style="${p};font-size:14px;color:#5d6780">${esc(j.company)} · ${esc(j.location || 'India')}${j.salary ? ` · ${esc(j.salary)}` : ''} · <a style="${a}" href="${go(b.id, 'job', j.id)}">Apply on official site</a></p>`).join('')))
  }

  if (sponsor) {
    parts.push(section('Sponsor', `<div style="background:#fff7e8;border:1px solid #f3d9a4;border-radius:10px;padding:12px 14px"><p style="${p};margin:0"><b>${esc(sponsor.name)}:</b> ${esc(sponsor.message)} <a style="${a}" href="${go(b.id, 'sponsor', sponsor.id)}">Learn more</a></p></div>`))
  }

  if (b.scam_note) {
    parts.push(section('Scam watch', `<p style="${p}">${esc(b.scam_note)} Real employers never ask you to pay. <a style="${a}" href="${siteUrl('/report')}">Report a scam</a></p>`))
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(b.subject)}</title></head>
<body style="margin:0;background:#eef1f6;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b1220;padding:18px 28px;font:800 18px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#ffb23f">TierBridge <span style="color:#9aa6bf;font-weight:500;font-size:13px">· ${esc(BRANCH_LABEL[b.branch] ?? b.branch)} brief · ${esc(b.brief_date)}</span></td></tr>
<tr><td style="padding:22px 28px 0"><p style="${p}">${esc(b.intro)}</p></td></tr>
${parts.join('\n')}
<tr><td style="padding:26px 28px 28px;font:12px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#7a849b">You get this because you joined the TierBridge brief. <a style="color:#7a849b" href="${siteUrl(`/briefs/${b.id}`)}">View in browser</a> · <a style="color:#7a849b" href="${esc(unsubscribeUrl)}">Unsubscribe</a></td></tr>
</table></body></html>`

  const text = [
    b.intro, '',
    `TODAY'S SKILL: ${b.skill.title}`, b.skill.detail, b.skill.resource_url ? `Free resource: ${go(b.id, 'skill', 0)}` : '',
    offer ? `Go deeper (affiliate link): ${offer.title} ${go(b.id, 'affiliate', offer.id)}` : '', '',
    ...(b.news.length ? ['NEWS', ...b.news.map((n, i) => `- ${n.title}: ${n.why} ${go(b.id, 'news', i)}`), ''] : []),
    ...(jobs.length ? ['VERIFIED JOBS', ...jobs.map(j => `- ${j.title}, ${j.company}, ${j.location}: ${go(b.id, 'job', j.id)}`), ''] : []),
    sponsor ? `SPONSOR: ${sponsor.name}: ${sponsor.message} ${go(b.id, 'sponsor', sponsor.id)}\n` : '',
    b.scam_note ? `SCAM WATCH: ${b.scam_note}\n` : '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].filter(l => l !== null).join('\n')

  return { subject: b.subject, html, text }
}
