// app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    const paymentId = formData.get('payment_id') as string
    const paymentRequestId = formData.get('payment_request_id') as string
    const status = formData.get('status') as string
    const email = formData.get('buyer') as string
    const mac = formData.get('mac') as string

    console.log(`Instamojo Webhook received: Payment ID: ${paymentId}, Status: ${status}, Email: ${email}`)

    if (!email || !status) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    // Instamojo sends 'Credit' for successful payments
    if (status.toLowerCase() === 'credit') {
      const trimmedEmail = email.toLowerCase().trim()

      if (supabase) {
        // Update Premium Status in Supabase student_profiles table
        const { error } = await supabase
          .from('student_profiles')
          .update({ is_premium: true })
          .eq('email', trimmedEmail)

        if (error) {
          console.error(`Supabase update error for ${trimmedEmail}:`, error)
          return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 })
        }

        console.log(`Successfully upgraded student to Pro via Instamojo: ${trimmedEmail}`)
      } else {
        console.warn('Supabase client is not initialized in Webhook.')
      }

      return NextResponse.json({ success: true, message: 'Student upgraded successfully' })
    }

    return NextResponse.json({ success: true, message: 'Payment status not credit, no action taken' })
  } catch (error: any) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
