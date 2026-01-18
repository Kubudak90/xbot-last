// Background Task Runner
// Manages and executes background tasks with priority queue

import prisma from '@/lib/prisma'

export type TaskType =
  | 'post_tweet'
  | 'analyze_style'
  | 'scrape_profile'
  | 'scrape_timeline'
  | 'check_trends'
  | 'sync_followers'
  | 'generate_content'
  | 'cleanup'

export type TaskPriority = 'high' | 'normal' | 'low'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Task {
  id: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  payload: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  retryCount: number
  maxRetries: number
  scheduledFor?: Date
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}

export interface TaskHandler {
  (payload: Record<string, unknown>): Promise<Record<string, unknown> | void>
}

class TaskRunner {
  private handlers: Map<TaskType, TaskHandler> = new Map()
  private isRunning: boolean = false
  private processingInterval: NodeJS.Timeout | null = null
  private currentTasks: Map<string, Task> = new Map()
  private maxConcurrent: number = 3

  private readonly PROCESS_INTERVAL_MS = 5000 // Check every 5 seconds
  private readonly DEFAULT_MAX_RETRIES = 3

  /**
   * Register a task handler
   */
  registerHandler(type: TaskType, handler: TaskHandler): void {
    this.handlers.set(type, handler)
    console.log(`Registered handler for task type: ${type}`)
  }

  /**
   * Start the task runner
   */
  start(): void {
    if (this.isRunning) {
      console.log('Task runner is already running')
      return
    }

    this.isRunning = true
    console.log('Task runner started')

    // Initial processing
    this.processTasks()

    // Set up interval for regular processing
    this.processingInterval = setInterval(() => {
      this.processTasks()
    }, this.PROCESS_INTERVAL_MS)
  }

  /**
   * Stop the task runner
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false

    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    console.log('Task runner stopped')
  }

  /**
   * Add a new task to the queue
   */
  async addTask(
    type: TaskType,
    payload: Record<string, unknown>,
    options?: {
      priority?: TaskPriority
      scheduledFor?: Date
      maxRetries?: number
    }
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const task: Task = {
      id: taskId,
      type,
      priority: options?.priority || 'normal',
      status: 'pending',
      payload,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.DEFAULT_MAX_RETRIES,
      scheduledFor: options?.scheduledFor,
      createdAt: new Date(),
    }

    // Store task in memory (in production, use Redis or database)
    this.currentTasks.set(taskId, task)

    // Log to analytics
    await this.logTaskEvent(taskId, 'task_created', { type, priority: task.priority })

    console.log(`Added task ${taskId} (${type}) with priority ${task.priority}`)

    return taskId
  }

  /**
   * Get task status
   */
  getTask(taskId: string): Task | undefined {
    return this.currentTasks.get(taskId)
  }

  /**
   * Cancel a pending task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.currentTasks.get(taskId)

    if (!task) return false

    if (task.status !== 'pending') {
      return false
    }

    task.status = 'cancelled'
    await this.logTaskEvent(taskId, 'task_cancelled', {})

    return true
  }

  /**
   * Process pending tasks
   */
  private async processTasks(): Promise<void> {
    if (!this.isRunning) return

    // Count currently running tasks
    const runningCount = Array.from(this.currentTasks.values()).filter(
      (t) => t.status === 'running'
    ).length

    if (runningCount >= this.maxConcurrent) return

    // Get pending tasks sorted by priority and scheduled time
    const pendingTasks = Array.from(this.currentTasks.values())
      .filter((t) => {
        if (t.status !== 'pending') return false
        if (t.scheduledFor && t.scheduledFor > new Date()) return false
        return true
      })
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Then by creation time
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

    // Process tasks up to max concurrent limit
    const tasksToProcess = pendingTasks.slice(0, this.maxConcurrent - runningCount)

    for (const task of tasksToProcess) {
      this.executeTask(task)
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type)

    if (!handler) {
      console.error(`No handler registered for task type: ${task.type}`)
      task.status = 'failed'
      task.error = `No handler for task type: ${task.type}`
      return
    }

    task.status = 'running'
    task.startedAt = new Date()

    await this.logTaskEvent(task.id, 'task_started', {})

    try {
      const result = await handler(task.payload)

      task.status = 'completed'
      task.completedAt = new Date()
      task.result = result as Record<string, unknown> | undefined

      await this.logTaskEvent(task.id, 'task_completed', {
        duration: task.completedAt.getTime() - task.startedAt.getTime(),
      })

      console.log(`Task ${task.id} completed successfully`)

      // Clean up completed tasks after a delay
      setTimeout(() => {
        this.currentTasks.delete(task.id)
      }, 60000) // Keep for 1 minute
    } catch (error) {
      task.retryCount++

      if (task.retryCount < task.maxRetries) {
        // Retry with exponential backoff
        const backoffMs = Math.pow(2, task.retryCount) * 1000
        task.status = 'pending'
        task.scheduledFor = new Date(Date.now() + backoffMs)

        await this.logTaskEvent(task.id, 'task_retry', {
          retryCount: task.retryCount,
          backoffMs,
        })

        console.log(`Task ${task.id} failed, retrying in ${backoffMs}ms (attempt ${task.retryCount}/${task.maxRetries})`)
      } else {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : 'Unknown error'
        task.completedAt = new Date()

        await this.logTaskEvent(task.id, 'task_failed', {
          error: task.error,
          retryCount: task.retryCount,
        })

        console.error(`Task ${task.id} failed permanently: ${task.error}`)
      }
    }
  }

  /**
   * Log task event to analytics
   */
  private async logTaskEvent(
    taskId: string,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.analyticsLog.create({
        data: {
          eventType: `task_${eventType}`,
          data: JSON.stringify({
            taskId,
            ...data,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (error) {
      console.error('Failed to log task event:', error)
    }
  }

  /**
   * Get runner status
   */
  getStatus(): {
    isRunning: boolean
    pendingCount: number
    runningCount: number
    completedCount: number
    failedCount: number
  } {
    const tasks = Array.from(this.currentTasks.values())

    return {
      isRunning: this.isRunning,
      pendingCount: tasks.filter((t) => t.status === 'pending').length,
      runningCount: tasks.filter((t) => t.status === 'running').length,
      completedCount: tasks.filter((t) => t.status === 'completed').length,
      failedCount: tasks.filter((t) => t.status === 'failed').length,
    }
  }

  /**
   * Get all tasks (for debugging/monitoring)
   */
  getAllTasks(): Task[] {
    return Array.from(this.currentTasks.values())
  }
}

// Singleton instance
export const taskRunner = new TaskRunner()

// Register default handlers
taskRunner.registerHandler('cleanup', async () => {
  // Clean up old data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  await prisma.analyticsLog.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
    },
  })

  return { cleaned: true }
})
