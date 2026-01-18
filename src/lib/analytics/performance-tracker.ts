// Performance Tracker
// Monitors system performance and health

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: {
    name: string
    status: 'up' | 'down' | 'degraded'
    latency?: number
    message?: string
  }[]
  uptime: number
  lastCheck: Date
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private startTime: Date = new Date()
  private readonly MAX_METRICS_PER_TYPE = 1000

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricList = this.metrics.get(name)!
    metricList.push(metric)

    // Keep only recent metrics
    if (metricList.length > this.MAX_METRICS_PER_TYPE) {
      metricList.shift()
    }
  }

  /**
   * Record a timed operation
   */
  async timeOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string, windowMs: number = 60000): number | null {
    const metricList = this.metrics.get(name)
    if (!metricList || metricList.length === 0) return null

    const cutoff = new Date(Date.now() - windowMs)
    const recentMetrics = metricList.filter((m) => m.timestamp >= cutoff)

    if (recentMetrics.length === 0) return null

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / recentMetrics.length
  }

  /**
   * Get percentile metric value
   */
  getPercentileMetric(name: string, percentile: number, windowMs: number = 60000): number | null {
    const metricList = this.metrics.get(name)
    if (!metricList || metricList.length === 0) return null

    const cutoff = new Date(Date.now() - windowMs)
    const recentValues = metricList
      .filter((m) => m.timestamp >= cutoff)
      .map((m) => m.value)
      .sort((a, b) => a - b)

    if (recentValues.length === 0) return null

    const index = Math.ceil((percentile / 100) * recentValues.length) - 1
    return recentValues[Math.max(0, index)]
  }

  /**
   * Get metric summary
   */
  getMetricSummary(name: string, windowMs: number = 60000): {
    count: number
    avg: number | null
    min: number | null
    max: number | null
    p50: number | null
    p95: number | null
    p99: number | null
  } {
    const metricList = this.metrics.get(name)
    if (!metricList || metricList.length === 0) {
      return { count: 0, avg: null, min: null, max: null, p50: null, p95: null, p99: null }
    }

    const cutoff = new Date(Date.now() - windowMs)
    const recentValues = metricList
      .filter((m) => m.timestamp >= cutoff)
      .map((m) => m.value)
      .sort((a, b) => a - b)

    if (recentValues.length === 0) {
      return { count: 0, avg: null, min: null, max: null, p50: null, p95: null, p99: null }
    }

    const sum = recentValues.reduce((acc, v) => acc + v, 0)
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * recentValues.length) - 1
      return recentValues[Math.max(0, index)]
    }

    return {
      count: recentValues.length,
      avg: sum / recentValues.length,
      min: recentValues[0],
      max: recentValues[recentValues.length - 1],
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const components: HealthStatus['components'] = []

    // Check database connection
    try {
      const start = performance.now()
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      await prisma.$queryRaw`SELECT 1`
      await prisma.$disconnect()
      const latency = performance.now() - start

      components.push({
        name: 'Database',
        status: latency < 100 ? 'up' : 'degraded',
        latency,
      })
    } catch (error) {
      components.push({
        name: 'Database',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    // Check scheduler
    const { tweetScheduler } = await import('@/lib/scheduler/tweet-scheduler')
    const schedulerStatus = tweetScheduler.getStatus()
    components.push({
      name: 'Tweet Scheduler',
      status: schedulerStatus.isRunning ? 'up' : 'down',
    })

    // Check task runner
    const { taskRunner } = await import('@/lib/scheduler/task-runner')
    const taskRunnerStatus = taskRunner.getStatus()
    components.push({
      name: 'Task Runner',
      status: taskRunnerStatus.isRunning ? 'up' : 'down',
      message: `Pending: ${taskRunnerStatus.pendingCount}, Running: ${taskRunnerStatus.runningCount}`,
    })

    // Determine overall status
    const downComponents = components.filter((c) => c.status === 'down')
    const degradedComponents = components.filter((c) => c.status === 'degraded')

    let status: HealthStatus['status'] = 'healthy'
    if (downComponents.length > 0) {
      status = 'unhealthy'
    } else if (degradedComponents.length > 0) {
      status = 'degraded'
    }

    return {
      status,
      components,
      uptime: Date.now() - this.startTime.getTime(),
      lastCheck: new Date(),
    }
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys())
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime()
  }

  /**
   * Format uptime as string
   */
  getFormattedUptime(): string {
    const uptime = this.getUptime()
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker()
