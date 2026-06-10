// scratch/seed_skills.ts
import * as fs from 'fs'
import * as path from 'path'

// 1. Manually load environment variables from .env.local
try {
  const envPath = path.resolve(__dirname, '../.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx > -1) {
        const key = trimmed.substring(0, idx).trim()
        const value = trimmed.substring(idx + 1).trim()
        process.env[key] = value
      }
    })
  }
} catch (e) {
  console.error('Failed to parse .env.local:', e)
}

// 2. Mock WebSocket for Supabase client initialization in Node.js environment
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class MockWebSocket {}
}

// 3. Import supabase utilities after env vars & mock WebSockets are populated
import { saveCorporateSkills, MOCK_CORPORATE_SKILLS } from '../lib/supabase'

async function runSeed() {
  console.log('--- LIVE SUPABASE SEEDING ---')
  console.log(`Connecting to URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`Loading ${MOCK_CORPORATE_SKILLS.length} corporate skills...`)
  
  const success = await saveCorporateSkills(MOCK_CORPORATE_SKILLS)
  if (success) {
    console.log('SUCCESS: Successfully seeded corporate skills table in Supabase!')
  } else {
    console.log('ERROR: Failed to save corporate skills to database. Ensure you have run the table creation DDL in your Supabase SQL editor.')
  }
}

runSeed().catch(err => {
  console.error('Unexpected seeding error:', err)
})
