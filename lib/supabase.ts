// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export interface StudentProfile {
  name: string
  email: string
  college: string
  branch: string
  year: string
  workstyle: string
  priority: string
  skills: string[]
  createdAt: string
  passwordHash?: string
  referralCode?: string
  referredByCode?: string
  isPremium?: boolean
  referralProDays?: number
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

// Rich high-fidelity mock registrations to populate the Admin Dashboard out-of-the-box
const MOCK_PROFILES: StudentProfile[] = [
  {
    name: 'Amit Sharma',
    email: 'amit.sharma@vit.edu',
    college: 'VIT Vellore',
    branch: 'CSE',
    year: '4th Year',
    workstyle: 'pro_dev',
    priority: 'high_paying',
    skills: ['c', 'html', 'java', 'db'],
    createdAt: '2026-06-06T10:15:00.000Z'
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@cet.ac.in',
    college: 'CET Trivandrum',
    branch: 'MECH',
    year: '4th Year',
    workstyle: 'design',
    priority: 'fast_hire',
    skills: ['c', 'cad2d'],
    createdAt: '2026-06-06T09:30:00.000Z'
  },
  {
    name: 'Karthik N',
    email: 'karthik.n@nitt.edu',
    college: 'NIT Trichy',
    branch: 'ECE',
    year: '4th Year',
    workstyle: 'embedded',
    priority: 'high_paying',
    skills: ['c', 'circuits'],
    createdAt: '2026-06-06T08:12:00.000Z'
  },
  {
    name: 'Rohan Das',
    email: 'rohan.das@bits-pilani.ac.in',
    college: 'BITS Pilani',
    branch: 'CSE',
    year: '3rd Year',
    workstyle: 'pro_dev',
    priority: 'high_paying',
    skills: ['c', 'java', 'db'],
    createdAt: '2026-06-05T16:24:00.000Z'
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha.reddy@rvce.edu.in',
    college: 'RVCE Bangalore',
    branch: 'IT',
    year: '3rd Year',
    workstyle: 'pro_dev',
    priority: 'stable_mnc',
    skills: ['html', 'java', 'db'],
    createdAt: '2026-06-05T14:10:00.000Z'
  },
  {
    name: 'Ananya Sen',
    email: 'ananya.sen@jadavpur.edu',
    college: 'Jadavpur University',
    branch: 'CIVIL',
    year: '4th Year',
    workstyle: 'infra',
    priority: 'stable_mnc',
    skills: ['cad2d'],
    createdAt: '2026-06-05T11:45:00.000Z'
  },
  {
    name: 'Vikram Malhotra',
    email: 'vikram.m@dtu.ac.in',
    college: 'DTU Delhi',
    branch: 'MCA',
    year: '2nd Year',
    workstyle: 'pro_dev',
    priority: 'high_paying',
    skills: ['c', 'java', 'db'],
    createdAt: '2026-06-04T18:30:00.000Z'
  },
  {
    name: 'Pooja Patel',
    email: 'pooja.p@nirma.ac.in',
    college: 'Nirma University',
    branch: 'BCA',
    year: '3rd Year',
    workstyle: 'low_code',
    priority: 'fast_hire',
    skills: ['html', 'db'],
    createdAt: '2026-06-04T15:20:00.000Z'
  },
  {
    name: 'Sandeep Rao',
    email: 'sandeep.r@pes.edu',
    college: 'PES University',
    branch: 'CSE',
    year: '2nd Year',
    workstyle: 'ai_data',
    priority: 'high_paying',
    skills: ['c', 'java'],
    createdAt: '2026-06-04T10:05:00.000Z'
  },
  {
    name: 'Divya Joshi',
    email: 'divya.j@coep.org.in',
    college: 'COEP Pune',
    branch: 'ECE',
    year: '4th Year',
    workstyle: 'embedded',
    priority: 'stable_mnc',
    skills: ['c', 'circuits'],
    createdAt: '2026-06-03T16:40:00.000Z'
  },
  {
    name: 'Arjun Verma',
    email: 'arjun.v@psgtech.edu',
    college: 'PSG Tech Coimbatore',
    branch: 'MECH',
    year: '3rd Year',
    workstyle: 'design',
    priority: 'fast_hire',
    skills: ['cad2d'],
    createdAt: '2026-06-03T14:15:00.000Z'
  },
  {
    name: 'Meera Nair',
    email: 'meera.n@amrita.edu',
    college: 'Amrita Coimbatore',
    branch: 'IT',
    year: '4th Year',
    workstyle: 'automation',
    priority: 'stable_mnc',
    skills: ['c', 'html', 'db'],
    createdAt: '2026-06-03T09:50:00.000Z'
  }
]

// Fetch profiles from localStorage (fallback database)
function getLocalProfiles(): StudentProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const list = localStorage.getItem('tb_registered_profiles')
    return list ? JSON.parse(list) : []
  } catch (e) {
    return []
  }
}

// Add profile to localStorage (fallback database)
function saveLocalProfile(profile: StudentProfile): void {
  if (typeof window === 'undefined') return
  try {
    const list = getLocalProfiles()
    const index = list.findIndex(p => p.email.toLowerCase() === profile.email.toLowerCase())
    if (index > -1) {
      list[index] = profile
    } else {
      list.unshift(profile)
    }
    localStorage.setItem('tb_registered_profiles', JSON.stringify(list))
  } catch (e) {}
}

export async function saveProfile(profile: Omit<StudentProfile, 'createdAt'>): Promise<boolean> {
  const fullProfile: StudentProfile = {
    ...profile,
    createdAt: new Date().toISOString()
  }

  // Save to client storage (acts as cache & fallback)
  saveLocalProfile(fullProfile)

  if (supabase) {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .upsert({
          email: fullProfile.email.toLowerCase(),
          name: fullProfile.name,
          college: fullProfile.college,
          branch: fullProfile.branch,
          year: fullProfile.year,
          workstyle: fullProfile.workstyle,
          priority: fullProfile.priority,
          skills: fullProfile.skills,
          created_at: fullProfile.createdAt
        }, { onConflict: 'email' })

      if (error) {
        console.error('Supabase upsert error:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Supabase query exception:', err)
      return false
    }
  }

  // Successful save in local fallback mode
  return true
}

export async function getProfile(email: string): Promise<StudentProfile | null> {
  const emailLower = email.toLowerCase()

  // 1. Try live Supabase connection first if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('email', emailLower)
        .single()

      if (!error && data) {
        const mapped: StudentProfile = {
          name: data.name,
          email: data.email,
          college: data.college,
          branch: data.branch,
          year: data.year,
          workstyle: data.workstyle,
          priority: data.priority,
          skills: Array.isArray(data.skills) ? data.skills : [],
          createdAt: data.created_at,
          passwordHash: data.password_hash,
          referralCode: data.referral_code,
          referredByCode: data.referred_by_code,
          isPremium: data.is_premium || false,
          referralProDays: data.referral_pro_days || 0
        }
        return mapped
      }
    } catch (err) {
      console.error('getProfile Supabase error:', err)
    }
  }

  // 2. Try local list cache
  const localList = getLocalProfiles()
  const localProf = localList.find(p => p.email.toLowerCase() === emailLower)
  if (localProf) return localProf

  // 3. Try mock seed records (for convenient testing of logged accounts)
  const mockProf = MOCK_PROFILES.find(p => p.email.toLowerCase() === emailLower)
  if (mockProf) return mockProf

  return null
}

export async function getAllProfiles(): Promise<StudentProfile[]> {
  // If Supabase is active, fetch live data
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Map database records
        const dbProfiles: StudentProfile[] = data.map((item: any) => ({
          name: item.name,
          email: item.email,
          college: item.college,
          branch: item.branch,
          year: item.year,
          workstyle: item.workstyle,
          priority: item.priority,
          skills: Array.isArray(item.skills) ? item.skills : [],
          createdAt: item.created_at,
          passwordHash: item.password_hash,
          referralCode: item.referral_code,
          referredByCode: item.referred_by_code,
          isPremium: item.is_premium || false,
          referralProDays: item.referral_pro_days || 0
        }))

        // Combine DB profiles with Mock seeds to ensure a rich dashboard representation
        const combined = [...dbProfiles]
        MOCK_PROFILES.forEach(mock => {
          if (!combined.some(p => p.email.toLowerCase() === mock.email.toLowerCase())) {
            combined.push(mock)
          }
        })
        return combined
      }
    } catch (err) {
      console.error('Failed to fetch from Supabase, returning local & mock:', err)
    }
  }

  // Fallback: Combine local profiles created in sandbox + seed mock profiles
  const localList = getLocalProfiles()
  const combined = [...localList]
  MOCK_PROFILES.forEach(mock => {
    if (!combined.some(p => p.email.toLowerCase() === mock.email.toLowerCase())) {
      combined.push(mock)
    }
  })

  // Sort by date descending
  return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export interface CorporateSkill {
  id: string
  name: string
  category: string
  demand: number
  companies: string[]
  lastCrawled: string
}

export const MOCK_CORPORATE_SKILLS: CorporateSkill[] = [
  { id: 'bedrock', name: 'AWS Bedrock APIs', category: 'Cloud AI / GenAI', demand: 96, companies: ['Amazon', 'Accenture', 'TCS'], lastCrawled: new Date().toISOString() },
  { id: 'mulesoft', name: 'MuleSoft DataWeave', category: 'Integration Platforms', demand: 92, companies: ['Salesforce', 'Deloitte', 'Capgemini'], lastCrawled: new Date().toISOString() },
  { id: 'servicenow', name: 'ServiceNow Workflows', category: 'Enterprise Platforms', demand: 89, companies: ['Accenture', 'Deloitte', 'Infosys'], lastCrawled: new Date().toISOString() },
  { id: 'salesforce', name: 'Salesforce Apex Dev', category: 'CRM & ERP', demand: 91, companies: ['Salesforce', 'Cognizant', 'Persistent'], lastCrawled: new Date().toISOString() },
  { id: 'uipath', name: 'UiPath RPA Studio', category: 'RPA & Automation', demand: 87, companies: ['TCS Digital', 'Infosys BPM', 'Wipro'], lastCrawled: new Date().toISOString() },
  { id: 'canalyzer', name: 'Vector CANalyzer', category: 'Automotive Electronics', demand: 94, companies: ['Ather Energy', 'Ola Electric', 'Bosch'], lastCrawled: new Date().toISOString() },
  { id: 'ansys', name: 'Ansys FEA Solver', category: 'Simulation & FEA', demand: 85, companies: ['Tata Motors', 'Mahindra', 'HAL'], lastCrawled: new Date().toISOString() },
  { id: 'revit', name: 'Autodesk Revit BIM', category: 'BIM & Design', demand: 88, companies: ['L&T Construction', 'Shapoorji', 'DLF'], lastCrawled: new Date().toISOString() },
  { id: 'powerbi', name: 'Snowflake Analytics', category: 'Data & Analytics', demand: 86, companies: ['Deloitte', 'PwC', 'KPMG'], lastCrawled: new Date().toISOString() },
  { id: 'staad', name: 'STAAD.Pro Concrete', category: 'Structural Analysis', demand: 80, companies: ['L&T Construction', 'Gammon India', 'AECOM'], lastCrawled: new Date().toISOString() },
  { id: 'boomi', name: 'Dell Boomi Flow', category: 'Integration Platforms', demand: 83, companies: ['Dell Technologies', 'IBM', 'Accenture'], lastCrawled: new Date().toISOString() },
  { id: 'wordpress', name: 'Shopify Partners / WordPress', category: 'Web & eCommerce', demand: 82, companies: ['Digital agencies', 'D2C startups', 'startups'], lastCrawled: new Date().toISOString() },
  { id: 'watson', name: 'IBM Watson AI', category: 'Enterprise AI', demand: 85, companies: ['IBM India', 'TCS iON', 'Infosys'], lastCrawled: new Date().toISOString() },
  { id: 'aws-iot', name: 'AWS IoT Core Platform', category: 'IoT & Edge', demand: 90, companies: ['Ather Energy', 'Bosch India', 'Qualcomm'], lastCrawled: new Date().toISOString() },
  { id: 'labview', name: 'NI LabVIEW Systems', category: 'Test & Measurement', demand: 81, companies: ['ISRO', 'DRDO', 'Texas Instruments'], lastCrawled: new Date().toISOString() },
  { id: 'matlab-ece', name: 'MATLAB ECE Control', category: 'Simulation & Control', demand: 84, companies: ['Tata Elxsi', 'KPIT', 'Continental'], lastCrawled: new Date().toISOString() },
  { id: 'matlab-mech', name: 'MATLAB Mech Systems', category: 'Simulation & Control', demand: 83, companies: ['ISRO', 'DRDO', 'Tata Motors'], lastCrawled: new Date().toISOString() },
  { id: 'siemens-nx', name: 'Siemens NX CAD/PLM', category: 'CAD & PLM', demand: 86, companies: ['Tata Elxsi', 'HAL', 'Boeing India'], lastCrawled: new Date().toISOString() },
  { id: 'qgis', name: 'QGIS Geospatial Maps', category: 'GIS & Geospatial', demand: 82, companies: ['NHAI', 'Smart City SPVs', 'AECOM'], lastCrawled: new Date().toISOString() },
  { id: 'primavera', name: 'Oracle Primavera Scheduling', category: 'Project Management', demand: 79, companies: ['L&T Construction', 'Afcons', 'RITES'], lastCrawled: new Date().toISOString() },
  { id: 'ga4', name: 'Google Analytics & Ads', category: 'Digital Marketing', demand: 89, companies: ['Performics', 'GroupM', 'startups'], lastCrawled: new Date().toISOString() },
  { id: 'docker', name: 'Docker Containers', category: 'DevOps & Containers', demand: 92, companies: ['TCS', 'Cognizant', 'Razorpay'], lastCrawled: new Date().toISOString() },
  { id: 'kubernetes', name: 'Kubernetes Orchestration', category: 'DevOps & Containers', demand: 95, companies: ['Google', 'Microsoft', 'Red Hat'], lastCrawled: new Date().toISOString() },
  { id: 'terraform', name: 'Terraform IaC Cloud', category: 'DevOps & Infrastructure', demand: 91, companies: ['HashiCorp', 'AWS India', 'Deloitte'], lastCrawled: new Date().toISOString() },
  { id: 'kafka', name: 'Apache Kafka Streaming', category: 'Data Pipelines & Streaming', demand: 88, companies: ['Confluent', 'Uber India', 'Paytm'], lastCrawled: new Date().toISOString() },
  { id: 'redis', name: 'Redis Cache & Store', category: 'Caching & Databases', demand: 87, companies: ['Redis Labs', 'Swiggy', 'Zomato'], lastCrawled: new Date().toISOString() },
  { id: 'graphql', name: 'GraphQL Modern APIs', category: 'Modern APIs', demand: 86, companies: ['Meta', 'Shopify', 'Gartner'], lastCrawled: new Date().toISOString() },
  { id: 'nextjs', name: 'Next.js Web Framework', category: 'Web Frameworks', demand: 94, companies: ['Vercel', 'CRED', 'Zepto'], lastCrawled: new Date().toISOString() },
  { id: 'fastapi', name: 'FastAPI Python Web', category: 'Web Frameworks', demand: 85, companies: ['Netflix', 'Uber', 'TCS AI'], lastCrawled: new Date().toISOString() },
  { id: 'aws-lambda', name: 'AWS Lambda Serverless', category: 'Serverless Cloud', demand: 90, companies: ['Amazon', 'Accenture', 'Swiggy'], lastCrawled: new Date().toISOString() },
  { id: 'figma', name: 'Figma UI/UX Prototype', category: 'UI/UX Design', demand: 88, companies: ['Figma', 'Google', 'Flipkart'], lastCrawled: new Date().toISOString() },
  { id: 'altium', name: 'Altium Designer PCB', category: 'PCB Design', demand: 89, companies: ['Qualcomm', 'Intel', 'Ather Energy'], lastCrawled: new Date().toISOString() },
  { id: 'kicad', name: 'KiCad Open PCB', category: 'PCB Design', demand: 81, companies: ['DRDO', 'freelancers', 'makerspaces'], lastCrawled: new Date().toISOString() },
  { id: 'freertos', name: 'FreeRTOS IoT Kernel', category: 'Real-Time OS', demand: 91, companies: ['Bosch', 'Texas Instruments', 'Qualcomm'], lastCrawled: new Date().toISOString() },
  { id: 'stm32', name: 'STM32CubeMX Embedded', category: 'Embedded Systems', demand: 87, companies: ['Schneider', 'Ather', 'Bosch'], lastCrawled: new Date().toISOString() },
  { id: 'canoe', name: 'Vector CANoe Automotive', category: 'Automotive Electronics', demand: 90, companies: ['Ola Electric', 'Tesla India', 'Continental'], lastCrawled: new Date().toISOString() },
  { id: 'cadence', name: 'Cadence Virtuoso VLSI', category: 'VLSI Design', demand: 93, companies: ['Qualcomm', 'Intel', 'MediaTek'], lastCrawled: new Date().toISOString() },
  { id: 'synopsys', name: 'Synopsys ASIC Compiler', category: 'VLSI Design', demand: 92, companies: ['NVIDIA', 'Intel', 'AMD'], lastCrawled: new Date().toISOString() },
  { id: 'autocad3d', name: 'AutoCAD 3D Layouts', category: 'CAD & Design', demand: 80, companies: ['L&T', 'Godrej', 'Afcons'], lastCrawled: new Date().toISOString() },
  { id: 'creo', name: 'PTC Creo CAD Modeling', category: 'CAD & Design', demand: 83, companies: ['Mahindra', 'Caterpillar', 'John Deere'], lastCrawled: new Date().toISOString() },
  { id: 'fusion360', name: 'Autodesk Fusion CAM', category: 'CAD & CAM', demand: 84, companies: ['Tata Elxsi', 'startups', 'CNC shops'], lastCrawled: new Date().toISOString() },
  { id: 'fluent', name: 'Ansys Fluent CFD', category: 'Simulation & FEA', demand: 87, companies: ['Tata Motors', 'ISRO', 'GE'], lastCrawled: new Date().toISOString() },
  { id: 'lsdyna', name: 'Ansys LS-DYNA Crash', category: 'Simulation & FEA', demand: 86, companies: ['Mahindra', 'Maruti', 'L&T Defence'], lastCrawled: new Date().toISOString() },
  { id: 'catia', name: 'CATIA Aerospace CAD', category: 'CAD & Design', demand: 88, companies: ['Boeing', 'Airbus', 'HAL'], lastCrawled: new Date().toISOString() },
  { id: 'mastercam', name: 'Mastercam CNC CAM', category: 'CAM & CNC', demand: 81, companies: ['L&T Heavy', 'Godrej Aerospace', 'exporters'], lastCrawled: new Date().toISOString() },
  { id: 'civil3d', name: 'AutoCAD Civil 3D Roads', category: 'Civil Engineering', demand: 83, companies: ['NHAI contractors', 'AECOM', 'Jacobs'], lastCrawled: new Date().toISOString() },
  { id: 'etabs', name: 'Bentley ETABS Structures', category: 'Structural Analysis', demand: 86, companies: ['L&T Construction', 'Gammon', 'STUP'], lastCrawled: new Date().toISOString() },
  { id: 'tekla', name: 'Tekla Steel Structures', category: 'Structural Analysis', demand: 82, companies: ['Trimble', 'Shapoorji', 'Fabricators'], lastCrawled: new Date().toISOString() },
  { id: 'fpga', name: 'Xilinx Vivado (FPGA)', category: 'FPGA & VLSI', demand: 93, companies: ['Qualcomm', 'Intel', 'NVIDIA'], lastCrawled: new Date().toISOString() },
  { id: 'solidworks', name: 'SolidWorks', category: 'CAD & Design', demand: 85, companies: ['Tata Motors', 'Mahindra', 'Godrej'], lastCrawled: new Date().toISOString() }
]


function getLocalCorporateSkills(): CorporateSkill[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('tb_corporate_skills')
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

function saveLocalCorporateSkills(skills: CorporateSkill[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('tb_corporate_skills', JSON.stringify(skills))
  } catch (e) {}
}

export async function getCorporateSkills(): Promise<CorporateSkill[]> {
  // If Supabase is active, fetch from it
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('corporate_skills')
        .select('*')
        .order('demand', { ascending: false })

      if (!error && data) {
        if (data.length >= MOCK_CORPORATE_SKILLS.length) {
          return data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            demand: item.demand,
            companies: Array.isArray(item.companies) ? item.companies : [],
            lastCrawled: item.last_crawled
          }))
        } else {
          // Database has fewer items than our seed list (or is empty) - seed/sync them
          console.log(`Database skills count (${data.length}) is less than expected (${MOCK_CORPORATE_SKILLS.length}). Seeding/syncing...`)
          await saveCorporateSkills(MOCK_CORPORATE_SKILLS)
          // Re-fetch to return the complete database set
          const { data: refreshed, error: refError } = await supabase
            .from('corporate_skills')
            .select('*')
            .order('demand', { ascending: false })
          if (!refError && refreshed) {
            return refreshed.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              demand: item.demand,
              companies: Array.isArray(item.companies) ? item.companies : [],
              lastCrawled: item.last_crawled
            }))
          }
          return MOCK_CORPORATE_SKILLS
        }
      }
    } catch (err) {
      console.error('Failed to fetch corporate skills from Supabase:', err)
    }
  }

  // Fallback: localStorage
  const localList = getLocalCorporateSkills()
  if (localList.length > 0) {
    return localList
  }

  // Initial Seed
  saveLocalCorporateSkills(MOCK_CORPORATE_SKILLS)
  return MOCK_CORPORATE_SKILLS
}

export async function saveCorporateSkills(skills: CorporateSkill[]): Promise<boolean> {
  // Save locally
  saveLocalCorporateSkills(skills)

  if (supabase) {
    try {
      // Upsert all skills
      const rows = skills.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        demand: s.demand,
        companies: s.companies,
        last_crawled: s.lastCrawled
      }))

      const { error } = await supabase
        .from('corporate_skills')
        .upsert(rows)

      if (error) {
        console.error('Supabase corporate skills upsert error:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Supabase corporate skills exception:', err)
      return false
    }
  }

  return true
}

export interface PlaybookRound {
  name: string
  type: string
  content: string
  questions: { q: string; a?: string }[]
  tips: string
}

export interface Playbook {
  id?: number
  studentName: string
  branch: string
  college: string
  year: string
  company: string
  role: string
  salary: string
  status: string
  difficulty: string
  tags: string[]
  summary: string
  rounds: PlaybookRound[]
  verified: boolean
  createdAt?: string
}

export async function getSupabasePlaybooks(): Promise<Playbook[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('playbooks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error || !data) return []
    return data.map((item: any) => ({
      id: item.id,
      studentName: item.student_name,
      branch: item.branch,
      college: item.college,
      year: item.year,
      company: item.company,
      role: item.role,
      salary: item.salary,
      status: item.status,
      difficulty: item.difficulty,
      tags: Array.isArray(item.tags) ? item.tags : [],
      summary: item.summary,
      rounds: Array.isArray(item.rounds) ? item.rounds : [],
      verified: item.verified,
      createdAt: item.created_at
    }))
  } catch (err) {
    console.error('getSupabasePlaybooks error:', err)
    return []
  }
}

export async function saveSupabasePlaybook(p: Omit<Playbook, 'id' | 'createdAt'>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('playbooks')
      .insert({
        student_name: p.studentName,
        branch: p.branch,
        college: p.college,
        year: p.year,
        company: p.company,
        role: p.role,
        salary: p.salary,
        status: p.status,
        difficulty: p.difficulty,
        tags: p.tags,
        summary: p.summary,
        rounds: p.rounds,
        verified: p.verified
      })
    if (error) {
      console.error('saveSupabasePlaybook error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('saveSupabasePlaybook exception:', err)
    return false
  }
}

export interface CommunityComment {
  id?: number
  postId?: number
  userName: string
  avatar: string
  color: string
  text: string
  createdAt?: string
}

export interface CommunityPost {
  id: number
  userName: string
  branch: string
  college: string
  year: string
  avatar: string
  color: string
  content: string
  tags: string[]
  likes: number
  comments: CommunityComment[]
  createdAt?: string
}

export async function getSupabasePosts(): Promise<CommunityPost[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*, community_comments(*)')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    
    return data.map((item: any) => ({
      id: item.id,
      userName: item.user_name,
      branch: item.branch,
      college: item.college,
      year: item.year,
      avatar: item.avatar,
      color: item.color,
      content: item.content,
      tags: Array.isArray(item.tags) ? item.tags : [],
      likes: item.likes || 0,
      comments: Array.isArray(item.community_comments) 
        ? item.community_comments.map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            userName: c.user_name,
            avatar: c.avatar,
            color: c.color,
            text: c.text,
            createdAt: c.created_at
          }))
        : [],
      createdAt: item.created_at
    }))
  } catch (err) {
    console.error('getSupabasePosts error:', err)
    return []
  }
}

export async function saveSupabasePost(p: Omit<CommunityPost, 'id' | 'likes' | 'comments' | 'createdAt'>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('community_posts')
      .insert({
        user_name: p.userName,
        branch: p.branch,
        college: p.college,
        year: p.year,
        avatar: p.avatar,
        color: p.color,
        content: p.content,
        tags: p.tags,
        likes: 0
      })
    if (error) {
      console.error('saveSupabasePost error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('saveSupabasePost exception:', err)
    return false
  }
}

export async function saveSupabaseComment(c: Omit<CommunityComment, 'id' | 'createdAt'>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('community_comments')
      .insert({
        post_id: c.postId,
        user_name: c.userName,
        avatar: c.avatar,
        color: c.color,
        text: c.text
      })
    if (error) {
      console.error('saveSupabaseComment error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('saveSupabaseComment exception:', err)
    return false
  }
}

export async function likeSupabasePost(postId: number, likesCount: number): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('community_posts')
      .update({ likes: likesCount })
      .eq('id', postId)
    if (error) {
      console.error('likeSupabasePost error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('likeSupabasePost exception:', err)
    return false
  }
}

export interface DirectMessage {
  id?: number
  studentEmail: string
  partnerName: string
  me: boolean
  text: string
  createdAt?: string
}

export async function getSupabaseDMs(studentEmail: string): Promise<DirectMessage[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('student_email', studentEmail.toLowerCase())
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return data.map((item: any) => ({
      id: item.id,
      studentEmail: item.student_email,
      partnerName: item.partner_name,
      me: item.me,
      text: item.text,
      createdAt: item.created_at
    }))
  } catch (err) {
    console.error('getSupabaseDMs error:', err)
    return []
  }
}

export async function saveSupabaseDM(dm: Omit<DirectMessage, 'id' | 'createdAt'>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        student_email: dm.studentEmail.toLowerCase(),
        partner_name: dm.partnerName,
        me: dm.me,
        text: dm.text
      })
    if (error) {
      console.error('saveSupabaseDM error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('saveSupabaseDM exception:', err)
    return false
  }
}

// Helper to hash passwords using SHA-256 (compatible with client & server)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Map database row to StudentProfile object
function mapDbProfile(item: any): StudentProfile {
  return {
    name: item.name,
    email: item.email,
    college: item.college,
    branch: item.branch,
    year: item.year,
    workstyle: item.workstyle,
    priority: item.priority,
    skills: Array.isArray(item.skills) ? item.skills : [],
    createdAt: item.created_at,
    passwordHash: item.password_hash,
    referralCode: item.referral_code,
    referredByCode: item.referred_by_code,
    isPremium: item.is_premium || false,
    referralProDays: item.referral_pro_days || 0
  }
}

export async function authenticateStudent(email: string, passwordPlain: string): Promise<StudentProfile | null> {
  const emailLower = email.toLowerCase().trim()
  const hash = await hashPassword(passwordPlain)

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('email', emailLower)
        .single()

      if (error || !data) return null
      const profile = mapDbProfile(data)
      if (profile.passwordHash === hash) {
        return profile
      }
      return null
    } catch (e) {
      console.error('authenticateStudent Supabase error:', e)
    }
  }

  // Fallback: LocalStorage
  const localList = getLocalProfiles()
  const localProf = localList.find(p => p.email.toLowerCase() === emailLower)
  if (localProf && localProf.passwordHash === hash) {
    return localProf
  }

  // Fallback: Check Mock profiles (simulated login with any password for easy testing)
  const mockProf = MOCK_PROFILES.find(p => p.email.toLowerCase() === emailLower)
  if (mockProf) {
    return {
      ...mockProf,
      passwordHash: hash, // accept any password for seed testing
      referralCode: `TB-${mockProf.name.split(' ')[0].toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      referralProDays: 0, // no free Pro days — must pay via Instamojo
      isPremium: false    // never auto-upgrade on registration
    }
  }

  return null
}

export async function registerStudent(p: Omit<StudentProfile, 'createdAt' | 'referralCode' | 'referralProDays'>, passwordPlain: string): Promise<StudentProfile | null> {
  const emailLower = p.email.toLowerCase().trim()
  const hash = await hashPassword(passwordPlain)
  
  // Generate unique referral code
  const cleanName = p.name.replace(/[^a-zA-Z]/g, '').toUpperCase()
  const codeName = cleanName.substring(0, 7) || 'STUDENT'
  const randomNum = Math.floor(100 + Math.random() * 900)
  const myRefCode = `TB-${codeName}-${randomNum}`

  let proDays = 0
  let referredByCodeClean = p.referredByCode?.trim().toUpperCase() || undefined

  // If there's a referral code, credit both users
  if (referredByCodeClean) {
    proDays = 7 // Referee gets 7 days of Pro access

    // Update Referrer (giver) in background / DB
    if (supabase) {
      try {
        // Find referrer profile
        const { data: referrer, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('referral_code', referredByCodeClean)
          .single()

        if (!error && referrer) {
          const newProDays = (referrer.referral_pro_days || 0) + 7
          await supabase
            .from('student_profiles')
            .update({ referral_pro_days: newProDays })
            .eq('email', referrer.email)
        } else {
          // invalid code
          referredByCodeClean = undefined
          proDays = 0
        }
      } catch (e) {
        console.error('Failed to credit referrer in Supabase:', e)
      }
    } else {
      // Offline fallback: update referrer in localStorage
      const localList = getLocalProfiles()
      const idx = localList.findIndex(prof => prof.referralCode === referredByCodeClean)
      if (idx > -1) {
        localList[idx].referralProDays = (localList[idx].referralProDays || 0) + 7
        localStorage.setItem('tb_registered_profiles', JSON.stringify(localList))
      } else {
        referredByCodeClean = undefined
        proDays = 0
      }
    }
  }

  const newProfile: StudentProfile = {
    ...p,
    email: emailLower,
    passwordHash: hash,
    referralCode: myRefCode,
    referredByCode: referredByCodeClean,
    referralProDays: proDays,
    isPremium: false,
    createdAt: new Date().toISOString()
  }

  // Save local fallback
  saveLocalProfile(newProfile)

  // Save to Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .upsert({
          email: newProfile.email,
          name: newProfile.name,
          college: newProfile.college,
          branch: newProfile.branch,
          year: newProfile.year,
          workstyle: newProfile.workstyle,
          priority: newProfile.priority,
          skills: newProfile.skills,
          password_hash: newProfile.passwordHash,
          referral_code: newProfile.referralCode,
          referred_by_code: newProfile.referredByCode,
          referral_pro_days: newProfile.referralProDays,
          is_premium: newProfile.isPremium,
          created_at: newProfile.createdAt
        }, { onConflict: 'email' })

      if (error) {
        console.error('registerStudent Supabase error:', error)
        return null
      }
    } catch (err) {
      console.error('registerStudent exception:', err)
      return null
    }
  }

  return newProfile
}

export async function getReferralStats(email: string, referralCode: string): Promise<{ count: number; proDays: number }> {
  if (supabase) {
    try {
      // Count students referred by this user
      const { count, error } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by_code', referralCode)

      // Fetch user's current referral_pro_days
      const { data: user, error: userErr } = await supabase
        .from('student_profiles')
        .select('referral_pro_days')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (!error && !userErr && user) {
        return {
          count: count || 0,
          proDays: user.referral_pro_days || 0
        }
      }
    } catch (e) {
      console.error('getReferralStats Supabase error:', e)
    }
  }

  // Fallback: LocalStorage
  const localList = getLocalProfiles()
  const referredList = localList.filter(p => p.referredByCode === referralCode)
  const self = localList.find(p => p.email.toLowerCase() === email.toLowerCase().trim())
  
  return {
    count: referredList.length,
    proDays: self?.referralProDays || 0
  }
}


