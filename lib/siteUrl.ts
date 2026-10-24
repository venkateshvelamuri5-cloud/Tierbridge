// Public base URL used in emails and redirects.
export function siteUrl(path = ''): string {
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}
