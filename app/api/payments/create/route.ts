// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json()

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json({
        success: false,
        error: 'Razorpay keys are not configured on the server.'
      }, { status: 500 })
    }

    // Razorpay amount is in paise (₹99 = 9900 paise)
    const amountInPaise = 9900

    // Call Razorpay API to create an order
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_pro_${Date.now()}`,
        notes: {
          student_name: name || 'Student',
          student_email: email.toLowerCase().trim(),
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Razorpay Order Creation Error: ${errorText}`)
    }

    const order = await response.json()

    return NextResponse.json({
      success: true,
      key: keyId,
      amount: amountInPaise,
      currency: 'INR',
      orderId: order.id,
      name: name || 'Student',
      email: email.toLowerCase().trim(),
    })
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Payment initiation failed',
    }, { status: 500 })
  }
}
