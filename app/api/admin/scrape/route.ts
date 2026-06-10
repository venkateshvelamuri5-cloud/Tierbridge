// app/api/admin/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { setFeedCache, getDb, writeDb } from '@/lib/db'

// Define keywords / query topics per branch
const BRANCH_QUERIES: Record<string, { query: string; tag: string }[]> = {
  CSE: [
    { query: 'uipath automation news hiring', tag: 'UiPath' },
    { query: 'mulesoft api integration news', tag: 'MuleSoft' },
    { query: 'amazon bedrock generative ai news', tag: 'Amazon Bedrock' }
  ],
  IT: [
    { query: 'aws cloud practitioner certification news', tag: 'AWS' },
    { query: 'servicenow workstyle administrator certification news', tag: 'ServiceNow' }
  ],
  ECE: [
    { query: 'embedded iot core systems firmware news', tag: 'IoT' },
    { query: 'xilinx vivado fpga semiconductor news', tag: 'FPGA' }
  ],
  MECH: [
    { query: 'ansys finite element analysis mechanical simulation news', tag: 'Ansys' },
    { query: 'solidworks 3d parametric cad engineering news', tag: 'SolidWorks' }
  ],
  CIVIL: [
    { query: 'autodesk revit bim building coordination news', tag: 'BIM' },
    { query: 'staad pro structural engineering steel analysis news', tag: 'STAAD' }
  ],
  BCA: [
    { query: 'shopify ecommerce theme customizer web dev news', tag: 'Shopify' },
    { query: 'wordpress theme block builder web engineering news', tag: 'WordPress' }
  ],
  MCA: [
    { query: 'spring boot backend microservices java news', tag: 'Java' },
    { query: 'mulesoft anpoint developer api integration news', tag: 'MuleSoft' }
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

async function scrapeDdg(query: string, tag: string): Promise<any[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) return []
    const html = await res.text()
    const blocks = html.split('class="result results_links results_links_deep web-result ')
    const results: any[] = []
    
    for (let i = 1; i < blocks.length && results.length < 4; i++) {
      const block = blocks[i]
      const titleMatch = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block)
      const snippetMatch = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(block)
      
      if (titleMatch) {
        let url = titleMatch[1]
        if (url.includes('uddg=')) {
          const parts = url.split('uddg=')
          if (parts[1]) {
            url = decodeURIComponent(parts[1].split('&')[0])
          }
        }
        if (url.startsWith('//')) {
          url = 'https:' + url
        }
        
        const title = titleMatch[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
        const summary = snippetMatch 
          ? snippetMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() 
          : ''
        
        let source = 'Industry News'
        try {
          const domain = new URL(url).hostname.replace('www.', '')
          source = domain.charAt(0).toUpperCase() + domain.slice(1)
        } catch(e){}

        results.push({
          type: 'insight',
          source,
          title,
          summary: summary || 'Latest industry developments, certification updates and career trends.',
          url,
          tags: [tag],
          readTime: '3 min',
          ago: '1d ago'
        })
      }
    }
    return results;
  } catch (err) {
    console.error(`Error scraping query "${query}":`, err)
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (email !== 'venkateshvelamuri5@gmail.com' || password !== 'Venk@tes#2876') {
      return NextResponse.json({ success: false, error: 'Unauthorized access credentials' }, { status: 401 })
    }

    const branches = ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL', 'BCA', 'MCA']
    const stats: Record<string, number> = {}

    for (const br of branches) {
      const queries = BRANCH_QUERIES[br] || []
      const branchItems: any[] = []

      // Add relevant static items
      const branchStatic = STATIC.filter(item => item.tags.some(t => {
        if (br === 'CSE' || br === 'IT' || br === 'MCA' || br === 'BCA') {
          return ['UiPath', 'MuleSoft', 'Amazon Bedrock', 'ServiceNow'].includes(t)
        }
        if (br === 'ECE') return ['FPGA', 'Amazon Bedrock'].includes(t)
        if (br === 'MECH') return ['Ansys'].includes(t)
        if (br === 'CIVIL') return ['BIM'].includes(t)
        return true
      }))
      branchItems.push(...branchStatic)

      // Fetch from DuckDuckGo search results
      for (const qObj of queries) {
        const scraped = await scrapeDdg(qObj.query, qObj.tag)
        branchItems.push(...scraped)
      }

      // Keep up to 20 items per branch feed
      const sliceLimit = branchItems.slice(0, 20)
      setFeedCache(br, sliceLimit, 24 * 60 * 60 * 1000) // Cache for 24 hours
      stats[br] = sliceLimit.length
    }

    return NextResponse.json({
      success: true,
      message: 'DuckDuckGo Live Feed Scraper executed successfully.',
      crawledCount: stats
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
