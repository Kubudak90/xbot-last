// Cookie-based Login API Route
// Allows login using X cookies instead of browser automation

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

const CookieLoginSchema = z.object({
  accountId: z.string().min(1),
  authToken: z.string().min(1),
  ct0: z.string().min(1),
})

// Encryption helper
function encrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }

  const iv = crypto.randomBytes(16)
  const salt = crypto.randomBytes(16)
  const derivedKey = crypto.scryptSync(key, salt, 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted
}

// Verify cookie by making a test request to X API
async function verifyCookies(authToken: string, ct0: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const response = await fetch('https://api.x.com/1.1/account/verify_credentials.json', {
      headers: {
        'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
        'X-Csrf-Token': ct0,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return { valid: true, username: data.screen_name }
    } else {
      const errorText = await response.text()
      return { valid: false, error: `X API error: ${response.status} - ${errorText}` }
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CookieLoginSchema.parse(body)

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Verify cookies are valid
    const verification = await verifyCookies(data.authToken, data.ct0)

    if (!verification.valid) {
      return NextResponse.json({
        success: false,
        error: verification.error || 'Invalid cookies',
      })
    }

    // Check username matches
    if (verification.username && verification.username.toLowerCase() !== account.username.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: `Cookie belongs to @${verification.username}, not @${account.username}`,
      })
    }

    // Encrypt and save cookies
    const encryptedAuthToken = encrypt(data.authToken)
    const encryptedCt0 = encrypt(data.ct0)

    await prisma.account.update({
      where: { id: data.accountId },
      data: {
        authToken: encryptedAuthToken,
        ct0Token: encryptedCt0,
        status: 'active',
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      username: verification.username,
    })
  } catch (error) {
    console.error('Cookie login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
