// Content for the marketing site. Briefs, jobs and paths here are sample
// content shown until the daily pipeline fills them from real sources.

export type Branch = 'CSE' | 'IT' | 'ECE' | 'MECH' | 'CIVIL' | 'BCA' | 'MCA'
export type BriefBranch = 'ECE' | 'MECH' | 'CIVIL' | 'CSE'

export const BRANCHES: Branch[] = ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL', 'BCA', 'MCA']
export const BRIEF_BRANCHES: BriefBranch[] = ['ECE', 'MECH', 'CIVIL', 'CSE']

export const BRANCH_COLOR: Record<Branch, number> = {
  CSE: 0x7fd6e8, IT: 0x9db8ff, ECE: 0xffb23f, MECH: 0xff8f6b,
  CIVIL: 0x6fe0b0, BCA: 0xd7a6ff, MCA: 0x8fe3ff,
}

// Branches without their own brief yet share the CSE one.
export function briefBranch(b: Branch): BriefBranch {
  return (BRIEF_BRANCHES as string[]).includes(b) ? (b as BriefBranch) : 'CSE'
}

type TickKind = 'skill' | 'job' | 'news'

export interface Brief {
  subject: string
  skill: [title: string, detail: string]
  news: [headline: string, why: string][]
  sponsor: string
  tick: [kind: TickKind, title: string, detail: string][]
}

export const BRIEFS: Record<BriefBranch, Brief> = {
  ECE: {
    subject: 'Why every EV maker wants CAN bus skills',
    skill: ['Read a CAN frame in Python', 'Free python-can library with a virtual bus. No hardware needed.'],
    news: [
      ['Chip fabs announce fresher hiring drives', "Entry roles ask for Verilog and basic analog. Here's what shows up most."],
      ['PSU recruitment through GATE ECE opens', "Key dates and last year's cutoff trend in three lines."],
      ['RISC-V boards get cheaper', 'A ₹1,500 board is enough to learn embedded this semester.'],
    ],
    sponsor: 'Sponsored: a 6-week embedded systems batch with a free demo class.',
    tick: [
      ['skill', 'Read a CAN frame in Python', '5-minute skill for today'],
      ['job', 'Embedded Software Trainee', 'Sample EV component maker · Bengaluru'],
      ['news', 'PSU recruitment via GATE ECE', 'Dates and cutoffs, explained'],
    ],
  },
  MECH: {
    subject: 'FEA is the skill core companies keep asking for',
    skill: ['Your first stress test in Ansys Student', 'Load a bracket, fix one face, apply a force, read the result.'],
    news: [
      ['EV makers grow design teams in Pune', 'Roles want CAD plus basic simulation.'],
      ['GATE ME registration opens', 'Dates, fee and the subjects that carry the most marks.'],
      ['3D printing reaches small factories', 'What additive skills look like on a fresher resume.'],
    ],
    sponsor: 'Sponsored: student discount on SolidWorks CSWA prep.',
    tick: [
      ['skill', 'First stress test in Ansys Student', '5-minute skill for today'],
      ['job', 'CAE Analyst, Fresher', 'Sample engineering services firm · Chennai'],
      ['news', 'GATE ME registration opens', 'What to do this week'],
    ],
  },
  CIVIL: {
    subject: 'BIM is becoming mandatory on big projects',
    skill: ['Model a simple room in Revit', 'Walls, a door, a window and a sheet. Free education licence.'],
    news: [
      ['State PWD posts junior engineer vacancies', 'Eligibility, dates and exam pattern in plain words.'],
      ['Metro projects hire site engineers in tier-2 cities', 'Skills site roles list most often.'],
      ['GIS in smart city planning', 'Why QGIS (free) is worth a weekend.'],
    ],
    sponsor: 'Sponsored: a weekend Revit course from a BIM institute.',
    tick: [
      ['skill', 'Model a room in Revit', '5-minute skill for today'],
      ['job', 'BIM Modeler, Fresher', 'Sample design consultancy · Kochi'],
      ['news', 'PWD junior engineer vacancies', 'Eligibility and dates'],
    ],
  },
  CSE: {
    subject: "What 'AI engineer' actually means for freshers",
    skill: ['Call an LLM API in 10 lines', 'Send a prompt, read the reply, handle an error.'],
    news: [
      ['Service firms shift fresher hiring to cloud', 'Which certifications they mention most.'],
      ['Open-source project wants first-timers', 'How to pick a good first issue this week.'],
      ['Product startups resume campus hiring', 'What their coding rounds usually test.'],
    ],
    sponsor: 'Sponsored: free student cloud credits and a cert voucher.',
    tick: [
      ['skill', 'Call an LLM API in 10 lines', '5-minute skill for today'],
      ['job', 'Associate Software Engineer', 'Sample SaaS startup · Remote'],
      ['news', 'Fresher hiring shifts to cloud', 'What it means for you'],
    ],
  },
}

export interface Job {
  branch: Branch
  title: string
  company: string
  location: string
  salary: string
  tags: string[]
  featured?: boolean
  checked: string
  /** Tracked apply link, present on live jobs. */
  href?: string
}

export const JOBS: Job[] = [
  { branch: 'ECE', title: 'Embedded Software Trainee', company: 'Sample EV component maker', location: 'Bengaluru', salary: '₹4.5–6 LPA', tags: ['C', 'CAN', 'RTOS'], featured: true, checked: '2 days ago' },
  { branch: 'ECE', title: 'FPGA Design Intern', company: 'Sample semiconductor startup', location: 'Hyderabad', salary: '₹25k / mo', tags: ['Verilog', 'Vivado'], checked: 'today' },
  { branch: 'MECH', title: 'Graduate Engineer Trainee, Design', company: 'Sample auto parts maker', location: 'Pune', salary: '₹3.6–4.2 LPA', tags: ['SolidWorks', 'GD&T'], checked: 'yesterday' },
  { branch: 'MECH', title: 'CAE Analyst, Fresher', company: 'Sample engineering services firm', location: 'Chennai', salary: '₹4–5 LPA', tags: ['Ansys', 'FEA'], featured: true, checked: 'today' },
  { branch: 'CIVIL', title: 'Site Engineer Trainee', company: 'Sample metro contractor', location: 'Lucknow', salary: '₹3–3.8 LPA', tags: ['AutoCAD', 'Execution'], checked: '3 days ago' },
  { branch: 'CIVIL', title: 'BIM Modeler, Fresher', company: 'Sample design consultancy', location: 'Kochi', salary: '₹3.2–4 LPA', tags: ['Revit', 'Navisworks'], checked: 'yesterday' },
  { branch: 'CSE', title: 'Associate Software Engineer', company: 'Sample SaaS startup', location: 'Remote', salary: '₹6–8 LPA', tags: ['Java', 'SQL'], checked: 'today' },
  { branch: 'IT', title: 'Cloud Support Trainee', company: 'Sample IT services firm', location: 'Noida', salary: '₹3.5–4.5 LPA', tags: ['AWS', 'Linux'], checked: '2 days ago' },
  { branch: 'MCA', title: 'Backend Developer Intern', company: 'Sample fintech startup', location: 'Gurugram', salary: '₹30k / mo', tags: ['Spring Boot', 'APIs'], checked: 'today' },
]

export const PATHS: Record<BriefBranch, string[]> = {
  ECE: ['C for microcontrollers', 'Reading datasheets', 'CAN bus and vehicle networks', 'RTOS basics with FreeRTOS', 'Verilog for beginners', 'Project: a battery monitor'],
  MECH: ['Sketching in SolidWorks', 'GD&T essentials', 'Static FEA in Ansys', 'Thermal analysis basics', 'Intro to CNC and CAM', 'Project: an optimised bracket'],
  CIVIL: ['AutoCAD drawing standards', 'Revit basics', 'Quantity estimation', 'STAAD.Pro frames', 'QGIS for site maps', 'Project: a small building model'],
  CSE: ['Git and GitHub properly', 'SQL that interviewers ask', 'REST APIs with Node', 'Cloud basics on AWS', 'Calling LLM APIs', 'Project: a deployed app'],
}

export const PLAN_FEATURES = {
  free: ['Daily brief for your branch', 'Every verified job', 'Semester learning path', 'Scam watch and reports'],
  pro: ['Everything in Free', 'Company interview playbooks', 'Alerts when a chosen company posts', 'Salary ranges by role and city'],
  college: ['Batch skill and gap dashboard', 'Verified jobs matched to students', 'Brief branded for your college', 'Placement-season reports'],
}

export const FAQ: [question: string, answer: string][] = [
  ['Is it really free?', 'Yes. The daily brief, every verified job, the semester path and Scam watch are free. Pro adds company interview playbooks, company alerts and salary ranges.'],
  ['How do you verify jobs?', "We only list roles we can trace to the company's official careers page or a confirmed recruiter, and we re-check them before each brief goes out. Each card shows when it was last checked."],
  ['Will employers get my phone number?', "No. You apply on the company's own site. We never share your contact details without asking you first."],
  ["I'm in Mechanical or Civil. Is this useful?", 'Yes. Every branch gets its own brief with core jobs, PSU and government notices, GATE dates and the tools your field uses.'],
  ['Can I get it on WhatsApp?', 'Yes. Each branch has a WhatsApp channel with the same brief. Email is there too if you prefer.'],
  ['Do you earn from the links in the brief?', 'Some course and book links are affiliate links, always labelled. TierBridge earns a small commission at no extra cost to you, and the free resource is always listed first.'],
]
