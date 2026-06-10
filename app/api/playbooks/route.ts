// app/api/playbooks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPlaybooks, addPlaybook } from '@/lib/db'
import { isSupabaseConfigured, getSupabasePlaybooks, saveSupabasePlaybook } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const branch = searchParams.get('branch')
    const search = searchParams.get('search')?.toLowerCase()

    let playbooks = []
    if (isSupabaseConfigured()) {
      playbooks = await getSupabasePlaybooks()
    } else {
      playbooks = getPlaybooks()
    }

    if (branch && branch !== 'all') {
      playbooks = playbooks.filter(p => p.branch === branch)
    }

    if (search) {
      playbooks = playbooks.filter(
        p =>
          p.company.toLowerCase().includes(search) ||
          p.role.toLowerCase().includes(search) ||
          p.tags.some(t => t.toLowerCase().includes(search)) ||
          p.studentName.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({ success: true, playbooks })
  } catch (err) {
    console.error('Error fetching playbooks:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch playbooks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentName, branch, college, year, company, role, salary, status, difficulty, tags, summary, rounds } = body

    // Simple validation
    if (!studentName || !branch || !college || !company || !role || !rounds || !Array.isArray(rounds)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const success = await saveSupabasePlaybook({
        studentName,
        branch,
        college,
        year: year || '2025 Grad',
        company,
        role,
        salary: salary || 'Not Specified',
        status: status || 'Offered',
        difficulty: difficulty || 'Medium',
        tags: tags || [],
        summary,
        rounds,
        verified: false
      })
      if (!success) {
        return NextResponse.json({ success: false, error: 'Failed to create playbook in Supabase' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    } else {
      const newPlaybook = addPlaybook({
        studentName,
        branch,
        college,
        year: year || '2025 Grad',
        company,
        role,
        salary: salary || 'Not Specified',
        status: status || 'Offered',
        difficulty: difficulty || 'Medium',
        tags: tags || [],
        summary,
        rounds
      })
      return NextResponse.json({ success: true, playbook: newPlaybook })
    }
  } catch (err) {
    console.error('Error creating playbook:', err)
    return NextResponse.json({ success: false, error: 'Failed to create playbook' }, { status: 500 })
  }
}

