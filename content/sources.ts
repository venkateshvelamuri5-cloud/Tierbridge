import type { BriefBranch } from './site'

// RSS feeds the pipeline reads for each branch's news. Edit freely; each feed
// should be a reputable publication with a public RSS URL.
export const NEWS_FEEDS: Record<BriefBranch, string[]> = {
  ECE: [
    'https://hackaday.com/blog/feed/',
    'https://dev.to/feed/tag/embedded',
    'https://dev.to/feed/tag/iot',
  ],
  MECH: [
    'https://hackaday.com/blog/feed/',
    'https://www.engineering.com/feed/',
  ],
  CIVIL: [
    'https://www.constructiondive.com/feed/',
    'https://www.engineering.com/feed/',
  ],
  CSE: [
    'https://dev.to/feed/tag/career',
    'https://dev.to/feed/tag/webdev',
    'https://dev.to/feed/tag/aws',
  ],
}

// Students in these branches receive the brief for the mapped branch.
export const SUBSCRIBER_BRIEF: Record<string, BriefBranch> = {
  CSE: 'CSE', IT: 'CSE', BCA: 'CSE', MCA: 'CSE',
  ECE: 'ECE', MECH: 'MECH', CIVIL: 'CIVIL',
}

// Title words that suggest a role is open to freshers.
export const FRESHER_HINTS = /\b(intern|internship|trainee|graduate|fresher|entry[- ]level|junior|associate|new grad|apprentice|campus)\b/i

// Words that suggest a role needs years of experience.
export const SENIOR_HINTS = /\b(senior|sr\.?|lead|principal|staff|manager|director|head of|architect|vp)\b/i
