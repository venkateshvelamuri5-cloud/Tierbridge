'use client'
import { AdminPanel } from '@/components/TierBridge'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  return <AdminPanel onClose={() => router.push('/')} />
}
