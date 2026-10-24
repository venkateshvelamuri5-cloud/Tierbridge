import 'server-only'
import { parseStringPromise } from 'xml2js'
import { BRIEF_BRANCHES } from '@/content/site'
import { NEWS_FEEDS } from '@/content/sources'
import { db } from '../db'

type Item = { url: string; title: string; source: string; snippet: string; feed_branch: string; published_at: string | null }

const text = (v: any): string => {
  if (v == null) return ''
  if (Array.isArray(v)) return text(v[0])
  if (typeof v === 'object') return text(v._ ?? v.$?.href ?? '')
  return String(v)
}
const strip = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

export async function readFeed(url: string, branch: string): Promise<Item[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'TierBridgeBot/1.0 (+https://tierbridge.in)' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status}`)
  const xml = await parseStringPromise(await res.text(), { explicitArray: true })
  const source = new URL(url).host.replace(/^www\./, '')
  // RSS 2.0
  const rss = xml?.rss?.channel?.[0]?.item ?? []
  // Atom
  const atom = xml?.feed?.entry ?? []
  const items: Item[] = [
    ...rss.map((i: any) => ({ url: text(i.link), title: text(i.title), snippet: strip(text(i.description)), date: text(i.pubDate) })),
    ...atom.map((e: any) => ({
      url: text((e.link ?? []).find((l: any) => !l.$?.rel || l.$.rel === 'alternate')?.$?.href ?? e.link),
      title: text(e.title), snippet: strip(text(e.summary ?? e.content)), date: text(e.published ?? e.updated),
    })),
  ].map(i => {
    const d = i.date ? new Date(i.date) : null
    return {
      url: i.url.trim(), title: strip(i.title).slice(0, 300), source, snippet: i.snippet.slice(0, 600), feed_branch: branch,
      published_at: d && !isNaN(d.getTime()) ? d.toISOString() : null,
    }
  })
  return items.filter(i => i.url.startsWith('https://') && i.title)
}

export type NewsResult = { feeds: number; stored: number; errors: string[] }

// Pulls the latest items from each branch's feeds. Items older than 3 days are skipped.
export async function fetchNews(): Promise<NewsResult> {
  const sb = db()
  const result: NewsResult = { feeds: 0, stored: 0, errors: [] }
  const cutoff = Date.now() - 3 * 86400_000
  for (const branch of BRIEF_BRANCHES) {
    for (const url of NEWS_FEEDS[branch]) {
      result.feeds++
      try {
        const items = (await readFeed(url, branch))
          .filter(i => !i.published_at || new Date(i.published_at).getTime() > cutoff)
          .slice(0, 20)
        if (!items.length) continue
        const { error, count } = await sb.from('news_items').upsert(items, { onConflict: 'url', ignoreDuplicates: true, count: 'exact' })
        if (error) throw new Error(error.message)
        result.stored += count ?? 0
      } catch (e) {
        result.errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  // Keep the table small.
  await sb.from('news_items').delete().lt('fetched_at', new Date(Date.now() - 30 * 86400_000).toISOString())
  return result
}
