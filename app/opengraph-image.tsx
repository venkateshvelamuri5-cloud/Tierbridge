import { ImageResponse } from 'next/og'

export const alt = 'TierBridge: verified jobs and a free daily brief for engineering students in India'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Social preview card, drawn in the site's colours.
export default function OpengraphImage() {
  const chip = { padding: '10px 22px', borderRadius: 999, border: '2px solid #25324d', color: '#9aa6bf', fontSize: 26 }
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, backgroundColor: '#0b1220', backgroundImage: 'radial-gradient(circle at 85% 30%, rgba(127,214,232,.18), transparent 45%), radial-gradient(circle at 10% 90%, rgba(255,178,63,.16), transparent 40%)', color: '#eef1f7', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <path d="M3 24 C10 9, 22 9, 29 24" stroke="#ffb23f" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M3 24h26" stroke="#7fd6e8" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M9.5 24v-7M16 24v-9.6M22.5 24v-7" stroke="#eef1f7" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 44, fontWeight: 800 }}>TierBridge</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          <span>Your branch. Verified jobs.</span>
          <span style={{ color: '#ffb23f' }}>Every morning.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {['ECE', 'MECH', 'CIVIL', 'CSE / IT'].map(b => <span key={b} style={chip}>{b}</span>)}
          </div>
          <span style={{ fontSize: 28, color: '#9aa6bf' }}>Free 3-minute brief · tierbridge.in</span>
        </div>
      </div>
    ),
    size,
  )
}
