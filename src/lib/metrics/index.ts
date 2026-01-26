// Prometheus-Compatible Metrics System
// Collects and exposes metrics in Prometheus format

import { getCache } from '@/lib/cache'
import { circuitBreakerRegistry } from '@/lib/circuit-breaker'

export type MetricType = 'counter' | 'gauge' | 'histogram'

export interface MetricLabel {
  name: string
  value: string
}

export interface Metric {
  name: string
  type: MetricType
  help: string
  value: number
  labels?: MetricLabel[]
  timestamp?: number
}

export interface HistogramMetric extends Metric {
  type: 'histogram'
  buckets: { le: number; count: number }[]
  sum: number
  count: number
}

/**
 * Metrics Collector
 */
class MetricsCollector {
  private counters: Map<string, { value: number; labels?: MetricLabel[] }> = new Map()
  private gauges: Map<string, { value: number; labels?: MetricLabel[] }> = new Map()
  private histograms: Map<
    string,
    { buckets: number[]; values: number[]; sum: number; count: number; labels?: MetricLabel[] }
  > = new Map()

  private metricHelp: Map<string, string> = new Map()

  // Default histogram buckets (in ms for latency)
  private defaultBuckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

  constructor() {
    this.registerDefaultMetrics()
  }

  private registerDefaultMetrics(): void {
    // Define help texts
    this.metricHelp.set('xbot_http_requests_total', 'Total HTTP requests')
    this.metricHelp.set('xbot_http_request_duration_ms', 'HTTP request duration in milliseconds')
    this.metricHelp.set('xbot_tweets_posted_total', 'Total tweets posted')
    this.metricHelp.set('xbot_tweets_failed_total', 'Total tweets failed')
    this.metricHelp.set('xbot_tweets_scheduled_total', 'Total tweets scheduled')
    this.metricHelp.set('xbot_ai_generations_total', 'Total AI generations')
    this.metricHelp.set('xbot_ai_generation_duration_ms', 'AI generation duration')
    this.metricHelp.set('xbot_rate_limit_exceeded_total', 'Rate limit exceeded count')
    this.metricHelp.set('xbot_circuit_breaker_state', 'Circuit breaker state (0=closed, 1=open, 2=half-open)')
    this.metricHelp.set('xbot_cache_hits_total', 'Cache hits')
    this.metricHelp.set('xbot_cache_misses_total', 'Cache misses')
    this.metricHelp.set('xbot_active_accounts', 'Number of active accounts')
    this.metricHelp.set('xbot_browser_sessions', 'Number of active browser sessions')
  }

  /**
   * Build metric key with labels
   */
  private buildKey(name: string, labels?: MetricLabel[]): string {
    if (!labels || labels.length === 0) return name
    const labelStr = labels.map((l) => `${l.name}="${l.value}"`).join(',')
    return `${name}{${labelStr}}`
  }

  /**
   * Increment a counter
   */
  incCounter(name: string, value: number = 1, labels?: MetricLabel[]): void {
    const key = this.buildKey(name, labels)
    const current = this.counters.get(key)?.value || 0
    this.counters.set(key, { value: current + value, labels })
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: MetricLabel[]): void {
    const key = this.buildKey(name, labels)
    this.gauges.set(key, { value, labels })
  }

  /**
   * Increment a gauge
   */
  incGauge(name: string, value: number = 1, labels?: MetricLabel[]): void {
    const key = this.buildKey(name, labels)
    const current = this.gauges.get(key)?.value || 0
    this.gauges.set(key, { value: current + value, labels })
  }

  /**
   * Decrement a gauge
   */
  decGauge(name: string, value: number = 1, labels?: MetricLabel[]): void {
    this.incGauge(name, -value, labels)
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(
    name: string,
    value: number,
    labels?: MetricLabel[],
    buckets?: number[]
  ): void {
    const key = this.buildKey(name, labels)
    const existing = this.histograms.get(key)

    if (existing) {
      existing.values.push(value)
      existing.sum += value
      existing.count++
    } else {
      this.histograms.set(key, {
        buckets: buckets || this.defaultBuckets,
        values: [value],
        sum: value,
        count: 1,
        labels,
      })
    }
  }

  /**
   * Time a function and record as histogram
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: MetricLabel[]
  ): Promise<T> {
    const start = Date.now()
    try {
      return await fn()
    } finally {
      this.observeHistogram(name, Date.now() - start, labels)
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = []

    // Counters
    const countersByName = new Map<string, Array<{ key: string; value: number; labels?: MetricLabel[] }>>()

    for (const [key, data] of this.counters.entries()) {
      const name = key.split('{')[0]
      if (!countersByName.has(name)) {
        countersByName.set(name, [])
      }
      countersByName.get(name)!.push({ key, ...data })
    }

    for (const [name, entries] of countersByName.entries()) {
      const help = this.metricHelp.get(name) || name
      lines.push(`# HELP ${name} ${help}`)
      lines.push(`# TYPE ${name} counter`)
      for (const entry of entries) {
        lines.push(`${entry.key} ${entry.value}`)
      }
    }

    // Gauges
    const gaugesByName = new Map<string, Array<{ key: string; value: number; labels?: MetricLabel[] }>>()

    for (const [key, data] of this.gauges.entries()) {
      const name = key.split('{')[0]
      if (!gaugesByName.has(name)) {
        gaugesByName.set(name, [])
      }
      gaugesByName.get(name)!.push({ key, ...data })
    }

    for (const [name, entries] of gaugesByName.entries()) {
      const help = this.metricHelp.get(name) || name
      lines.push(`# HELP ${name} ${help}`)
      lines.push(`# TYPE ${name} gauge`)
      for (const entry of entries) {
        lines.push(`${entry.key} ${entry.value}`)
      }
    }

    // Histograms
    for (const [key, data] of this.histograms.entries()) {
      const name = key.split('{')[0]
      const help = this.metricHelp.get(name) || name
      const labelStr = data.labels?.map((l) => `${l.name}="${l.value}"`).join(',') || ''

      lines.push(`# HELP ${name} ${help}`)
      lines.push(`# TYPE ${name} histogram`)

      // Calculate bucket counts
      for (const le of data.buckets) {
        const count = data.values.filter((v) => v <= le).length
        const bucketLabels = labelStr ? `${labelStr},le="${le}"` : `le="${le}"`
        lines.push(`${name}_bucket{${bucketLabels}} ${count}`)
      }

      // +Inf bucket
      const infLabels = labelStr ? `${labelStr},le="+Inf"` : `le="+Inf"`
      lines.push(`${name}_bucket{${infLabels}} ${data.count}`)

      // Sum and count
      if (labelStr) {
        lines.push(`${name}_sum{${labelStr}} ${data.sum}`)
        lines.push(`${name}_count{${labelStr}} ${data.count}`)
      } else {
        lines.push(`${name}_sum ${data.sum}`)
        lines.push(`${name}_count ${data.count}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics(): void {
    // Cache stats
    const cacheStats = getCache().getStats()
    this.setGauge('xbot_cache_hits_total', cacheStats.hits)
    this.setGauge('xbot_cache_misses_total', cacheStats.misses)
    this.setGauge('xbot_cache_size', cacheStats.size)

    // Circuit breaker states
    const cbStats = circuitBreakerRegistry.getAllStats()
    for (const [name, stats] of Object.entries(cbStats)) {
      const stateValue = stats.state === 'CLOSED' ? 0 : stats.state === 'OPEN' ? 1 : 2
      this.setGauge('xbot_circuit_breaker_state', stateValue, [
        { name: 'name', value: name },
      ])
    }

    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage()
      this.setGauge('xbot_nodejs_heap_used_bytes', mem.heapUsed)
      this.setGauge('xbot_nodejs_heap_total_bytes', mem.heapTotal)
      this.setGauge('xbot_nodejs_rss_bytes', mem.rss)
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
  }
}

// Singleton instance
export const metrics = new MetricsCollector()

// Convenience functions
export const incCounter = (name: string, value?: number, labels?: MetricLabel[]) =>
  metrics.incCounter(name, value, labels)

export const setGauge = (name: string, value: number, labels?: MetricLabel[]) =>
  metrics.setGauge(name, value, labels)

export const observeHistogram = (name: string, value: number, labels?: MetricLabel[]) =>
  metrics.observeHistogram(name, value, labels)

export const timeAsync = <T>(name: string, fn: () => Promise<T>, labels?: MetricLabel[]) =>
  metrics.timeAsync(name, fn, labels)

// Pre-defined metric helpers
export const httpMetrics = {
  requestTotal: (method: string, path: string, status: number) =>
    incCounter('xbot_http_requests_total', 1, [
      { name: 'method', value: method },
      { name: 'path', value: path },
      { name: 'status', value: String(status) },
    ]),

  requestDuration: (method: string, path: string, durationMs: number) =>
    observeHistogram('xbot_http_request_duration_ms', durationMs, [
      { name: 'method', value: method },
      { name: 'path', value: path },
    ]),
}

export const tweetMetrics = {
  posted: (accountId: string) =>
    incCounter('xbot_tweets_posted_total', 1, [{ name: 'account_id', value: accountId }]),

  failed: (accountId: string, reason: string) =>
    incCounter('xbot_tweets_failed_total', 1, [
      { name: 'account_id', value: accountId },
      { name: 'reason', value: reason },
    ]),

  scheduled: (accountId: string) =>
    incCounter('xbot_tweets_scheduled_total', 1, [{ name: 'account_id', value: accountId }]),
}

export const aiMetrics = {
  generation: (provider: string, type: string) =>
    incCounter('xbot_ai_generations_total', 1, [
      { name: 'provider', value: provider },
      { name: 'type', value: type },
    ]),

  generationDuration: (provider: string, durationMs: number) =>
    observeHistogram('xbot_ai_generation_duration_ms', durationMs, [
      { name: 'provider', value: provider },
    ]),
}

export default metrics
