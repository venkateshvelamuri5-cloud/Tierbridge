export default function Notice({ msg }: { msg?: string }) {
  if (!msg) return null
  const bad = /fail|error|can’t|must|needs/i.test(msg)
  return <p className={`notice${bad ? ' err' : ''}`} role="status">{msg}</p>
}
