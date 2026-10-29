import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseAdmin'

// Like supabaseAdmin(), but throws when Supabase isn't configured. For admin and cron code.
export function db(): SupabaseClient {
  const client = supabaseAdmin()
  if (!client) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return client
}

// Today's date in India (YYYY-MM-DD). Briefs are keyed by IST date.
export function istDate(d = new Date()): string {
  return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10)
}

export type JobRow = {
  id: number; source_key: string | null; title: string; company: string; location: string; url: string
  branches: string[]; tags: string[]; salary: string | null; status: 'pending' | 'live' | 'closed' | 'rejected'
  featured_until: string | null; origin: 'pipeline' | 'admin'; first_seen: string; last_checked: string
}

export type Skill = { title: string; detail: string; resource_name: string; resource_url: string | null; tags: string[] }
export type BriefNews = { title: string; url: string; source: string; why: string }

export type BriefRow = {
  id: number; branch: 'ECE' | 'MECH' | 'CIVIL' | 'CSE'; brief_date: string
  status: 'draft' | 'approved' | 'sent' | 'skipped'; subject: string; intro: string
  skill: Skill; news: BriefNews[]; job_ids: number[]; affiliate_offer_id: number | null
  sponsor_id: number | null; scam_note: string; recipients: number | null; sent_at: string | null; created_at: string
}

export type OfferRow = {
  id: number; program: string; title: string; url: string; skill_tags: string[]; branches: string[]
  price_note: string | null; active: boolean
}

export type SponsorRow = {
  id: number; name: string; branch: string; message: string; url: string; starts_on: string; ends_on: string; active: boolean
}

export function isFeatured(j: Pick<JobRow, 'featured_until'>): boolean {
  return !!j.featured_until && new Date(j.featured_until) > new Date()
}
