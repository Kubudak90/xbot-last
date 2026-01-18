// Health Check API

import { NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/analytics'

export async function GET() {
  try {
    const health = await performanceTracker.getHealthStatus()

    // Return appropriate HTTP status based on health
    const httpStatus =
      health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

    return NextResponse.json(
      {
        status: health.status,
        uptime: performanceTracker.getFormattedUptime(),
        uptimeMs: health.uptime,
        components: health.components,
        lastCheck: health.lastCheck.toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      },
      { status: httpStatus }
    )
  } catch (error) {
    console.error('Health check error:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
