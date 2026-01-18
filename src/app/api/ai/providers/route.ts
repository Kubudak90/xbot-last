// AI Providers Management API Route

import { NextRequest, NextResponse } from 'next/server'
import { getAIProviderManager, initializeProviders } from '@/lib/ai'

// Initialize providers on first request
let initialized = false

export async function GET() {
  try {
    if (!initialized) {
      initializeProviders()
      initialized = true
    }

    const manager = getAIProviderManager()
    const stats = manager.getProviderStats()
    const healthStatus = manager.getHealthStatus()

    const providers = stats.map(stat => ({
      ...stat,
      health: healthStatus.get(stat.type),
    }))

    return NextResponse.json({
      success: true,
      data: {
        providers,
        activeCount: providers.filter(p => p.isActive).length,
        healthyCount: providers.filter(p => p.isHealthy).length,
      },
    })
  } catch (error) {
    console.error('Provider list error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get providers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!initialized) {
      initializeProviders()
      initialized = true
    }

    const body = await request.json()
    const { action } = body

    const manager = getAIProviderManager()

    switch (action) {
      case 'health-check': {
        const healthResults = await manager.checkAllProvidersHealth()
        const results = Array.from(healthResults.entries()).map(([type, health]) => ({
          provider: type,
          ...health,
        }))

        return NextResponse.json({
          success: true,
          data: results,
        })
      }

      case 'health-check-single': {
        const { provider } = body
        if (!provider) {
          return NextResponse.json(
            { error: 'Provider type required' },
            { status: 400 }
          )
        }

        const health = await manager.checkProviderHealth(provider)

        return NextResponse.json({
          success: true,
          data: { provider, ...health },
        })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Provider action error:', error)
    return NextResponse.json(
      {
        error: 'Action failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
