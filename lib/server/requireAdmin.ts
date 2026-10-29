import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySession } from './auth'

// Second check behind the middleware, for server actions and pages.
export async function requireAdmin() {
  if (!(await verifySession(cookies().get(SESSION_COOKIE)?.value))) redirect('/admin/login')
}
