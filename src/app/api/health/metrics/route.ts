// Performance Metrics API
// Supports both JSON and Prometheus format

import { NextRequest, NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/analytics'
import { metrics } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const metricName = searchParams.get('name')
    const windowMs = parseInt(searchParams.get('window') || '60000')

    // Prometheus format
    if (format === 'prometheus') {
      metrics.collectSystemMetrics()
      const prometheusData = metrics.getPrometheusFormat()

      return new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      })
    }

    // JSON format
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
    const metricsData: Record<string, unknown> = {}

    for (const name of metricNames) {
      metricsData[name] = performanceTracker.getMetricSummary(name, windowMs)
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: metricsData,
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
