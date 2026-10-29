import Home from '@/components/site/Home'
import type { Branch, Job } from '@/content/site'
import { isFeatured } from '@/lib/server/db'
import { checkedLabel, liveJobs } from '@/lib/server/publicData'

export const revalidate = 600

// The home page shows live jobs once the pipeline has some, and samples until then.
export default async function Page() {
  const rows = (await liveJobs(undefined, 12)) ?? []
  const jobs: Job[] = rows.map(j => ({
    branch: (j.branches[0] ?? 'CSE') as Branch,
    title: j.title, company: j.company, location: j.location || 'India', salary: j.salary ?? '',
    tags: j.tags, featured: isFeatured(j), checked: checkedLabel(j.last_checked), href: `/go?k=job&i=${j.id}`,
  }))
  return <Home liveJobs={jobs} />
}
