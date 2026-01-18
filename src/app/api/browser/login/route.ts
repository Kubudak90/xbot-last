// Browser Login API Route

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createXAutomation } from '@/lib/browser'
import prisma from '@/lib/prisma'

const LoginSchema = z.object({
  accountId: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().optional(),
  twoFactorCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = LoginSchema.parse(body)

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

    // Create automation instance and login
    const xAutomation = createXAutomation(data.accountId)
    const result = await xAutomation.login({
      username: data.username,
      password: data.password,
      email: data.email,
      twoFactorCode: data.twoFactorCode,
    })

    if (result.success) {
      // Update account status
      await prisma.account.update({
        where: { id: data.accountId },
        data: {
          status: 'active',
          lastActiveAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: result.success,
      requiresTwoFactor: result.requiresTwoFactor,
      requiresEmailVerification: result.requiresEmailVerification,
      error: result.error,
    })
  } catch (error) {
    console.error('Login error:', error)

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

// Check login status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const xAutomation = createXAutomation(accountId)
    const isLoggedIn = await xAutomation.isLoggedIn()

    return NextResponse.json({
      success: true,
      isLoggedIn,
    })
  } catch (error) {
    console.error('Login status check error:', error)

    return NextResponse.json(
      {
        error: 'Failed to check login status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
