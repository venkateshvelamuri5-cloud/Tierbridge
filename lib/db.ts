// lib/db.ts
import fs from 'fs'
import path from 'path'
import { Branch } from './data'

export interface PlaybookRound {
  name: string
  type: string
  content: string
  questions: { q: string; a?: string }[]
  tips: string
}

export interface Playbook {
  id: number
  studentName: string
  branch: Branch
  college: string
  year: string
  company: string
  role: string
  salary: string
  status: 'Offered' | 'Selected'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  summary: string
  rounds: PlaybookRound[]
  verified: boolean
  createdAt: string
}

interface FeedCacheItem {
  type: 'news' | 'tool' | 'insight'
  source: string
  title: string
  summary: string
  url: string
  tags: string[]
  readTime: string
  ago: string
}

interface DbSchema {
  playbooks: Playbook[]
  feedCache: Record<string, { items: FeedCacheItem[]; expiresAt: number }>
}

const DB_FILE = path.join(process.cwd(), 'lib', 'db.json')

const DEFAULT_DB: DbSchema = {
  playbooks: [
    {
      id: 1,
      studentName: 'Amit Sharma',
      branch: 'CSE',
      college: 'VIT Vellore',
      year: '2025 Grad',
      company: 'Ather Energy',
      role: 'Full-Stack Developer (IoT Platform)',
      salary: 'Rs 12 LPA',
      status: 'Offered',
      difficulty: 'Medium',
      tags: ['React', 'Node.js', 'MQTT', 'IoT Platform'],
      summary: 'Applied online through college placement cell. Process had 3 rounds: Online Coding test, Technical Interview focusing on WebSockets/MQTT, and System Design.',
      rounds: [
        {
          name: 'Round 1: Online Coding & Aptitude Test',
          type: 'Coding',
          content: 'Conducted on HackerRank. Had 2 coding questions (medium level DSA: arrays, string manipulation) and 20 MCQs on networking, databases, and OS.',
          questions: [
            {
              q: 'Given an array of active EV charger coordinates, find the top K closest chargers to a user coordinate (K-Nearest Neighbors approach).',
              a: 'Solved using a Min-Heap of size K in O(N log K) time complexity. Verified all test cases passed.'
            },
            {
              q: 'Explain the difference between TCP and UDP in IoT communication.',
              a: 'TCP is connection-oriented and guarantees delivery (used for OTA firmware updates), while UDP is connectionless and lightweight (used for streaming real-time vehicle telemetry where occasional packet loss is acceptable).'
            }
          ],
          tips: 'Practice standard array/string problems on LeetCode and brush up on basic CS fundamentals.'
        },
        {
          name: 'Round 2: Technical Interview (Deep Dive)',
          type: 'Technical',
          content: 'One-on-one interview with the IoT Platform Team Lead. Focused heavily on JavaScript asynchronous patterns, database schema design, and MQTT brokers.',
          questions: [
            {
              q: 'How does an MQTT broker handle message queuing for offline devices?',
              a: 'Through Clean Session flags set to false and Persistent Sessions on the broker, combined with QoS (Quality of Service) levels 1 or 2.'
            },
            {
              q: 'Code a simple rate-limiter middleware in Node.js/Express.',
              a: 'Wrote an in-memory token bucket implementation checking request counts per IP. Explained how to scale it using Redis INCR and EXPIRE.'
            }
          ],
          tips: 'Be prepared to write code on a shared editor. Explain your thought process out loud.'
        },
        {
          name: 'Round 3: System Design & Fit',
          type: 'System Design',
          content: 'Discussed high-level architecture of a real-time EV telemetry ingestion system processing data from 10,000 active scooters.',
          questions: [
            {
              q: 'How would you prevent database write bottlenecks when 10,000 scooters send telemetry packets every 5 seconds?',
              a: 'Introduce a message broker like Apache Kafka or RabbitMQ as a buffer, and use a timeseries database (like InfluxDB or TimescaleDB) with bulk inserts instead of traditional SQL updates.'
            }
          ],
          tips: 'Draw clear blocks. Focus on modularity, load balancing, and buffer systems.'
        }
      ],
      verified: true,
      createdAt: '2026-06-05T10:00:00Z'
    },
    {
      id: 2,
      studentName: 'Priya Nair',
      branch: 'MECH',
      college: 'College of Engineering Trivandrum',
      year: '2025 Grad',
      company: 'Tata Motors',
      role: 'Graduate Engineer Trainee (GET) - Simulation',
      salary: 'Rs 8.5 LPA',
      status: 'Offered',
      difficulty: 'Hard',
      tags: ['Ansys', 'FEA', 'Suspension', 'SolidWorks'],
      summary: 'Off-campus recruitment following a portfolio submission. Round 1 was a CAD/Simulation test (STAAD/Ansys), followed by 2 technical panel interviews.',
      rounds: [
        {
          name: 'Round 1: Hands-on CAD & FEA Challenge',
          type: 'Practical Test',
          content: 'Given a 3D STEP file of a control arm. Had 3 hours to perform structural FEA using Ansys Mechanical, optimize geometry to reduce mass by 10% without exceeding yield strength, and submit a report.',
          questions: [
            {
              q: 'Perform mesh convergence study and find the Von Mises stress concentration points under a 5kN load.',
              a: 'Refined mesh around fillets where stress concentration was highest. Reached convergence at 120,000 nodes, stress stabilized at 195 MPa.'
            }
          ],
          tips: 'Master keyboard shortcuts in SolidWorks and clean up model geometry before running simulations.'
        },
        {
          name: 'Round 2: Technical Panel Interview',
          type: 'Technical',
          content: '3-member panel comprising Senior Principal Engineers. Questions were deep theoretical mechanics of materials and FEA formulation.',
          questions: [
            {
              q: 'What is the physical significance of Von Mises stress? Can it be used for brittle materials?',
              a: 'No, Von Mises is based on distortion energy theory and is used for ductile materials. Brittle materials should be analyzed using Maximum Normal Stress theory (Rankine).'
            },
            {
              q: 'Explain the difference between linear static analysis and non-linear analysis.',
              a: 'Linear static assumes small displacements, material obeys Hooke\'s law, and boundary conditions remain constant. Non-linear analysis accounts for large deflections, plasticity/material changes, or contact status updates during loading.'
            }
          ],
          tips: 'Don\'t guess. If you do not know a formula, explain your conceptual understanding.'
        }
      ],
      verified: true,
      createdAt: '2026-06-04T14:30:00Z'
    },
    {
      id: 3,
      studentName: 'Karthik N',
      branch: 'ECE',
      college: 'NIT Trichy',
      year: '2025 Grad',
      company: 'Qualcomm',
      role: 'Associate Hardware Engineer (VLSI)',
      salary: 'Rs 18 LPA',
      status: 'Offered',
      difficulty: 'Hard',
      tags: ['FPGA', 'Verilog', 'VLSI', 'Digital Design'],
      summary: 'On-campus placement. 1 Online test (VLSI and C concepts), 2 VLSI technical rounds, and 1 HR round. Highly competitive.',
      rounds: [
        {
          name: 'Round 1: Online VLSI & Aptitude Test',
          type: 'Technical Test',
          content: '30 questions in 60 minutes. Included setup/hold time questions, Verilog syntax, CMOS design, and basic C language pointers.',
          questions: [
            {
              q: 'Draw the circuit diagram of a 2-input NAND gate using CMOS logic.',
              a: 'N-channel MOSFETs in series connected to Ground; P-channel MOSFETs in parallel connected to VDD.'
            },
            {
              q: 'Calculate the maximum operating frequency given Setup Time = 2ns, Hold Time = 1ns, Clock-to-Q Delay = 1.5ns, Comb Delay = 4ns.',
              a: 'T_min = T_co + T_comb + T_setup = 1.5 + 4 + 2 = 7.5ns. Max Frequency = 1 / 7.5ns = 133.3 MHz.'
            }
          ],
          tips: 'Speed is key. Skip questions that require complex calculations and return to them later.'
        },
        {
          name: 'Round 2: Technical Interview 1 (Digital Design)',
          type: 'Technical',
          content: 'Deep dive into setup/hold violations, clock domain crossing (CDC), and finite state machines (FSM).',
          questions: [
            {
              q: 'How do you resolve a setup time violation without changing the clock frequency?',
              a: 'Reduce combinational delay by optimizing logic gates, splitting long paths with pipelining (adding flip-flops), or replacing slow components with faster ones.'
            },
            {
              q: 'Implement a synchronous FIFO buffer in Verilog.',
              a: 'Wrote the module on paper, including full/empty flag logic using gray codes for write/read pointers to avoid CDC issues.'
            }
          ],
          tips: 'Understand timing diagrams thoroughly. Drawing waveforms is very helpful.'
        }
      ],
      verified: true,
      createdAt: '2026-06-03T11:15:00Z'
    }
  ],
  feedCache: {}
}

export function getDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Create folder if not exists
      const dir = path.dirname(DB_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8')
      return DEFAULT_DB
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error('Error reading database file, returning default:', err)
    return DEFAULT_DB
  }
}

export function writeDb(data: DbSchema): void {
  try {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing to database file:', err)
  }
}

export function getPlaybooks(): Playbook[] {
  const db = getDb()
  return db.playbooks
}

export function addPlaybook(playbook: Omit<Playbook, 'id' | 'createdAt' | 'verified'>): Playbook {
  const db = getDb()
  const newPlaybook: Playbook = {
    ...playbook,
    id: db.playbooks.length > 0 ? Math.max(...db.playbooks.map(p => p.id)) + 1 : 1,
    verified: false, // submissions start unverified
    createdAt: new Date().toISOString()
  }
  db.playbooks.unshift(newPlaybook)
  writeDb(db)
  return newPlaybook
}

export function getFeedCache(branch: string): FeedCacheItem[] | null {
  const db = getDb()
  const cached = db.feedCache[branch]
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items
  }
  return null
}

export function setFeedCache(branch: string, items: FeedCacheItem[], durationMs = 15 * 60 * 1000): void {
  const db = getDb()
  db.feedCache[branch] = {
    items,
    expiresAt: Date.now() + durationMs
  }
  writeDb(db)
}
