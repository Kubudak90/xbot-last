// Scheduler Control API

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { tweetScheduler, taskRunner } from '@/lib/scheduler'

const ControlSchema = z.object({
  action: z.enum(['start', 'stop', 'status']),
  target: z.enum(['scheduler', 'taskRunner', 'all']).default('all'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, target } = ControlSchema.parse(body)

    const results: Record<string, unknown> = {}

    switch (action) {
      case 'start':
        if (target === 'scheduler' || target === 'all') {
          tweetScheduler.start()
          results.scheduler = { started: true }
        }
        if (target === 'taskRunner' || target === 'all') {
          taskRunner.start()
          results.taskRunner = { started: true }
        }
        break

      case 'stop':
        if (target === 'scheduler' || target === 'all') {
          tweetScheduler.stop()
          results.scheduler = { stopped: true }
        }
        if (target === 'taskRunner' || target === 'all') {
          taskRunner.stop()
          results.taskRunner = { stopped: true }
        }
        break

      case 'status':
        if (target === 'scheduler' || target === 'all') {
          results.scheduler = tweetScheduler.getStatus()
        }
        if (target === 'taskRunner' || target === 'all') {
          results.taskRunner = taskRunner.getStatus()
        }
        break
    }

    return NextResponse.json({
      success: true,
      action,
      target,
      results,
    })
  } catch (error) {
    console.error('Scheduler control error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Control action failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        scheduler: tweetScheduler.getStatus(),
        taskRunner: taskRunner.getStatus(),
      },
    })
  } catch (error) {
    console.error('Get status error:', error)

    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
