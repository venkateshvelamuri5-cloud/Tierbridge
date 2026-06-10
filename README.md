# TierBridge — Bridge the Gap. Own Your Career.

Dark theme with 3D animated branch backgrounds. Full five-section product.

## Five sections
| Section | What it does |
|---|---|
| Home | Dashboard — 3D branch background, hot tools, live feed below |
| Live Feed | Hacker News API + Dev.to API + TierBridge Intelligence, live |
| Enterprise Tools | Branch-specific tools — ECE sees chips/IoT, MECH sees CAD/FEA, CIVIL sees BIM/GIS |
| Roadmaps | 8 career tracks across all branches, 4 phases each |
| Community | Full LinkedIn-style social — posts, likes, comments, follow, DMs (mutual follows only) |

## 3D Backgrounds (branch-specific)
- **CSE** — floating laptops, code brackets `</>`, cubes, circuit traces on indigo dark
- **ECE** — IC chips with pins, resistors, oscilloscope waves, circuit boards on amber dark  
- **IT** — server racks, cubes, spheres, code symbols on violet dark
- **MECH** — gears with teeth, hex bolts, lightning bolts, CAD views on golden dark
- **CIVIL** — I-beams, blueprint grids, cubes, spheres on emerald dark
- **BCA** — phones, laptops, code symbols on pink dark
- **MCA** — servers, cubes, code brackets on blue dark

## Deploy in 5 minutes
```bash
unzip tierbridge-v3.zip
cd tb5
npm install
npx vercel
```

## Run locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Revenue model
| Tier | Price | Included |
|---|---|---|
| Free | ₹0 | Live feed · roadmap phases 1–2 · tool previews · basic community |
| Student | ₹149/month | All roadmaps · all tool guides · salary data · company targets · full community |
| College B2B | ₹25/student/year | All student features + TPO dashboard |

## Phase 2 additions
- Supabase — auth + real database for posts, follows, DMs
- Razorpay — ₹149/month subscription  
- Resend — weekly email digest
- TPO dashboard for college admins
