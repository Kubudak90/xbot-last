// Accounts API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

// GET - List all accounts
export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        status: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: accounts,
    })
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST - Create new account
const CreateAccountSchema = z.object({
  username: z.string().min(1).max(50),
  displayName: z.string().optional(),
  bio: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateAccountSchema.parse(body)

    // Check if account already exists
    const existing = await prisma.account.findUnique({
      where: { username: data.username },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Account with this username already exists' },
        { status: 409 }
      )
    }

    const account = await prisma.account.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        status: 'inactive', // Will be active after login
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Failed to create account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

// DELETE - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    await prisma.account.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted',
    })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
