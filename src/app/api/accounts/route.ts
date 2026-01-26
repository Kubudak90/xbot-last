// Accounts API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { handleApiError, ValidationError } from '@/lib/errors'
import { apiLogger as logger } from '@/lib/logger'

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

    logger.info('Accounts fetched', { count: accounts.length })

    return NextResponse.json({
      success: true,
      data: accounts,
    })
  } catch (error) {
    logger.error('Failed to fetch accounts', error as Error)
    const { statusCode, body } = handleApiError(error)
    return NextResponse.json(body, { status: statusCode })
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
      throw new ValidationError('Account with this username already exists', [
        { field: 'username', message: 'Username already taken' },
      ])
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

    logger.info('Account created', { accountId: account.id, username: account.username })

    return NextResponse.json({
      success: true,
      data: account,
    })
  } catch (error) {
    logger.error('Failed to create account', error as Error)
    const { statusCode, body } = handleApiError(error)
    return NextResponse.json(body, { status: statusCode })
  }
}

// DELETE - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Account ID is required', [
        { field: 'id', message: 'Required query parameter' },
      ])
    }

    await prisma.account.delete({
      where: { id },
    })

    logger.info('Account deleted', { accountId: id })

    return NextResponse.json({
      success: true,
      message: 'Account deleted',
    })
  } catch (error) {
    logger.error('Failed to delete account', error as Error)
    const { statusCode, body } = handleApiError(error)
    return NextResponse.json(body, { status: statusCode })
  }
}
