// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, email } = await req.json()

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !email) {
      return NextResponse.json({ success: false, error: 'Missing required signature verification fields' }, { status: 400 })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return NextResponse.json({ success: false, error: 'Server key not configured' }, { status: 500 })
    }

    // Verify signature: HMACSha256(order_id + "|" + payment_id, secret)
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const isValid = generatedSignature === razorpay_signature

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 })
    }

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

      console.log(`Successfully upgraded student to Pro via Razorpay: ${trimmedEmail}`)
    } else {
      console.warn('Supabase client is not initialized in Payment Verification.')
    }

    return NextResponse.json({ success: true, message: 'Payment verified and profile upgraded successfully' })
  } catch (error: any) {
    console.error('Signature verification failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
