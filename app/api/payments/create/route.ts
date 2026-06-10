// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from 'next/server'

async function getAccessToken() {
  const clientId = process.env.INSTAMOJO_CLIENT_ID
  const clientSecret = process.env.INSTAMOJO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Instamojo API credentials are not set in environment variables.')
  }

  const response = await fetch('https://api.instamojo.com/oauth2/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Instamojo Auth Error: ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json()

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const token = await getAccessToken()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tierbridge.in'

    const response = await fetch('https://api.instamojo.com/v2/payment_requests/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        purpose: 'TierBridge Pro 6-Months Access',
        amount: '99.00',
        buyer_name: name || 'Student',
        email: email.toLowerCase().trim(),
        redirect_url: `${appUrl}/?payment_success=true`,
        webhook: `${appUrl}/api/payments/webhook`,
        allow_repeated_payments: 'false',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Instamojo Payment Request Error: ${errorText}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      paymentUrl: data.longurl,
    })
  } catch (error: any) {
    console.error('Instamojo creation failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Payment initiation failed',
    }, { status: 500 })
  }
}
