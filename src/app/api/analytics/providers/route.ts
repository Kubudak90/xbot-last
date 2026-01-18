// AI Provider Stats API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyticsCollector } from '@/lib/analytics'

const QuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days')

    const params = QuerySchema.parse({
      days: days || 30,
    })

    const providerStats = await analyticsCollector.getAIProviderStats(params.days)

    return NextResponse.json({
      success: true,
      data: {
        providers: providerStats,
        period: {
          days: params.days,
          from: new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Provider stats error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get provider stats' },
      { status: 500 }
    )
  }
}
