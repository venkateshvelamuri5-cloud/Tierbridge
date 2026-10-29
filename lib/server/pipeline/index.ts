import 'server-only'
import { refreshJobs } from './jobs'
import { fetchNews } from './news'
import { composeBriefs } from './briefs'

// The morning run: refresh jobs, pull news, then draft each branch's brief.
export async function runDaily() {
  const jobs = await refreshJobs().catch(e => ({ error: String(e) }))
  const news = await fetchNews().catch(e => ({ error: String(e) }))
  const briefs = await composeBriefs().catch(e => ({ error: String(e) }))
  return { jobs, news, briefs }
}
