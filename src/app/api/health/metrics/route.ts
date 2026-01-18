// Performance Metrics API

import { NextRequest, NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('name')
    const windowMs = parseInt(searchParams.get('window') || '60000')

    if (metricName) {
      // Get specific metric summary
      const summary = performanceTracker.getMetricSummary(metricName, windowMs)

      return NextResponse.json({
        success: true,
        data: {
          name: metricName,
          windowMs,
          ...summary,
        },
      })
    }

    // Get all metrics
    const metricNames = performanceTracker.getMetricNames()
    const metrics: Record<string, unknown> = {}

    for (const name of metricNames) {
      metrics[name] = performanceTracker.getMetricSummary(name, windowMs)
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        metricCount: metricNames.length,
        windowMs,
        uptime: performanceTracker.getFormattedUptime(),
      },
    })
  } catch (error) {
    console.error('Metrics error:', error)

    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    )
  }
}
