// app/api/feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getFeedCache, setFeedCache } from '@/lib/db'
import { parseString } from 'xml2js'

const FEEDS: Record<string, string[]> = {
  CSE: [
    'https://dev.to/feed/tag/javascript',
    'https://dev.to/feed/tag/react'
  ],
  IT: [
    'https://dev.to/feed/tag/devops',
    'https://dev.to/feed/tag/aws'
  ],
  ECE: [
    'https://dev.to/feed/tag/embedded',
    'https://hackaday.com/blog/feed/'
  ],
  MECH: [
    'https://hackaday.com/blog/feed/' // Fallback for hardware news
  ],
  CIVIL: [
    'https://www.constructiondive.com/feed/'
  ],
  BCA: [
    'https://dev.to/feed/tag/beginners',
    'https://dev.to/feed/tag/webdev'
  ],
  MCA: [
    'https://dev.to/feed/tag/java',
    'https://dev.to/feed/tag/softwareengineering'
  ]
}

const STATIC = [
  { type:'tool' as const, source:'TierBridge', title:'UiPath AI-powered automation — RPA demand surges 34% in India', summary:'TCS and Infosys expanded UiPath practices by 40% in 6 months. Freshers with Community Edition experience are being fast-tracked.', url:'https://uipath.com', tags:['UiPath'], readTime:'2 min', ago:'2h ago' },
  { type:'tool' as const, source:'TierBridge', title:'MuleSoft Certified Developer salary hits Rs18 LPA at 2 years experience', summary:'New data shows MuleSoft certified developers averaging 40% above non-certified peers. 1,200+ active posts require Anypoint Platform skills.', url:'https://trailhead.salesforce.com', tags:['MuleSoft'], readTime:'2 min', ago:'4h ago' },
  { type:'tool' as const, source:'TierBridge', title:'Amazon Bedrock — AI engineering roles at Rs25+ LPA going unfilled', summary:'AWS India reports 3x demand for Bedrock-certified engineers vs available talent. AWS AI Practitioner cert is the fastest path in for students.', url:'https://aws.amazon.com/bedrock', tags:['Amazon Bedrock'], readTime:'2 min', ago:'5h ago' },
  { type:'tool' as const, source:'TierBridge', title:'ServiceNow CSA — highest ROI certification for IT freshers in 2025', summary:'ServiceNow CSAs earn 35% more than peers in year one. Capgemini, Accenture, DXC hiring 2,000+ ServiceNow professionals in India this year.', url:'https://developer.servicenow.com', tags:['ServiceNow'], readTime:'2 min', ago:'7h ago' },
  { type:'tool' as const, source:'TierBridge', title:'Ansys Student Edition free — FEA opens doors for MECH students', summary:'Ansys offers a fully-featured Student Edition at no cost. MECH engineers who can run FEA simulations are getting interviews at Tata Motors and KPIT.', url:'https://www.ansys.com/academic/students', tags:['Ansys'], readTime:'2 min', ago:'3h ago' },
  { type:'tool' as const, source:'TierBridge', title:'Xilinx Vivado WebPACK free — FPGA skills open semiconductor careers', summary:'Qualcomm, MediaTek, and Intel actively recruit FPGA-proficient ECE students. Xilinx Vivado WebPACK is completely free.', url:'https://www.xilinx.com', tags:['FPGA'], readTime:'2 min', ago:'6h ago' },
  { type:'tool' as const, source:'TierBridge', title:'Autodesk Revit free student license — BIM mandatory on govt projects', summary:'BIM is mandatory on Indian government infrastructure projects above Rs100 crore. CIVIL graduates with Revit skills command 20-30% salary premium.', url:'https://www.autodesk.com/education', tags:['BIM'], readTime:'2 min', ago:'8h ago' },
]

function parseXml(xml: string): Promise<any[]> {
  return new Promise((resolve) => {
    parseString(xml, { explicitArray: false }, (err, result) => {
      if (err || !result) {
        resolve([])
        return
      }
      try {
        const channel = result?.rss?.channel || result?.feed
        const rawItems = channel?.item || channel?.entry || []
        const items = Array.isArray(rawItems) ? rawItems : [rawItems]

        const parsed = items.slice(0, 10).map((item: any) => {
          let title = item.title || ''
          if (typeof title === 'object') title = title._ || ''

          let url = item.link || ''
          if (typeof url === 'object') {
            url = url.href || url._ || ''
          }
          if (Array.isArray(item.link)) {
            const relLink = item.link.find((l: any) => l.rel === 'alternate') || item.link[0]
            url = relLink.href || relLink._ || ''
          }

          let summary = item.description || item.summary || item.content || ''
          if (typeof summary === 'object') summary = summary._ || ''
          summary = summary.replace(/<[^>]*>/g, '').trim()
          if (summary.length > 180) {
            summary = summary.substring(0, 180) + '...'
          }

          let pubDate = item.pubDate || item.published || item.updated || ''
          if (typeof pubDate === 'object') pubDate = pubDate._ || ''

          let agoStr = 'recently'
          if (pubDate) {
            const diffMs = Date.now() - new Date(pubDate).getTime()
            const diffHours = Math.floor(diffMs / (3600 * 1000))
            if (diffHours < 24) {
              agoStr = diffHours > 0 ? `${diffHours}h ago` : 'just now'
            } else {
              agoStr = `${Math.floor(diffHours / 24)}d ago`
            }
          }

          return {
            type: 'insight' as const,
            source: url.includes('dev.to') ? 'Dev.to' : 'Tech Feed',
            title,
            summary,
            url,
            tags: [],
            readTime: '3 min',
            ago: agoStr
          }
        })
        resolve(parsed)
      } catch (e) {
        console.error('Error processing RSS elements:', e)
        resolve([])
      }
    })
  })
}

export async function GET(req: NextRequest) {
  const branch = new URL(req.url).searchParams.get('branch') || 'CSE'

  // 1. Check Cache
  const cached = getFeedCache(branch)
  if (cached) {
    return NextResponse.json({ branch, items: cached })
  }

  // 2. Fetch Fresh News
  const items: any[] = [...STATIC.filter(item => item.tags.some(t => {
    // E.g. Filter static items relative to this branch
    if (branch === 'CSE' || branch === 'IT' || branch === 'MCA' || branch === 'BCA') {
      return ['UiPath', 'MuleSoft', 'Amazon Bedrock', 'ServiceNow'].includes(t)
    }
    if (branch === 'ECE') return ['FPGA', 'Amazon Bedrock'].includes(t)
    if (branch === 'MECH') return ['Ansys'].includes(t)
    if (branch === 'CIVIL') return ['BIM'].includes(t)
    return true
  }))]

  const urls = FEEDS[branch] || FEEDS.CSE
  for (const url of urls) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 4000) // 4 sec timeout
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(id)
      
      if (res.ok) {
        const text = await res.text()
        const parsed = await parseXml(text)
        items.push(...parsed)
      }
    } catch (err) {
      console.error(`Error parsing feed from ${url}:`, err)
    }
  }

  // Shuffle or sort items to mingle static and dynamic items
  const sortedItems = items.slice(0, 20)

  // 3. Write Cache
  setFeedCache(branch, sortedItems)

  return NextResponse.json(
    { branch, items: sortedItems },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
  )
}
