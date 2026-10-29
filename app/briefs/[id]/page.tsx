import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav, Footer } from '@/components/site/Chrome'
import BriefView from '@/components/site/BriefView'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { loadBundle } from '@/lib/server/email'
import type { BriefRow } from '@/lib/server/db'

export const revalidate = 3600

async function getBrief(id: string): Promise<BriefRow | null> {
  const sb = supabaseAdmin()
  if (!sb || !/^\d+$/.test(id)) return null
  const { data } = await sb.from('briefs').select('*').eq('id', Number(id)).eq('status', 'sent').maybeSingle()
  return data as BriefRow | null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const b = await getBrief(params.id)
  return { title: b ? `${b.subject} · TierBridge` : 'Brief · TierBridge' }
}

export default async function BriefPage({ params }: { params: { id: string } }) {
  const brief = await getBrief(params.id)
  if (!brief) notFound()
  const bundle = await loadBundle(brief)
  return (
    <>
      <Nav />
      <section className="page">
        <div className="in">
          <div className="head">
            <span className="eyebrow">{brief.branch} brief · {brief.brief_date}</span>
            <h1>{brief.subject}</h1>
          </div>
          <BriefView bundle={bundle} />
        </div>
      </section>
      <Footer />
    </>
  )
}
