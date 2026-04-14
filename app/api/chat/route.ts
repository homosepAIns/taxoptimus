import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const res = await fetch(`${FASTAPI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      return NextResponse.json(
        { error: errorData.detail || 'Internal server error' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
