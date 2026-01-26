/**
 * @jest-environment node
 */

import {
  metrics,
  incCounter,
  setGauge,
  observeHistogram,
  timeAsync,
  httpMetrics,
  tweetMetrics,
  aiMetrics,
} from '@/lib/metrics'

describe('Metrics System', () => {
  beforeEach(() => {
    metrics.reset()
  })

  describe('Counters', () => {
    it('should increment counter', () => {
      incCounter('test_counter')
      incCounter('test_counter')
      incCounter('test_counter')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('test_counter 3')
    })

    it('should increment counter by specific value', () => {
      incCounter('test_counter_value', 5)
      incCounter('test_counter_value', 3)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('test_counter_value 8')
    })

    it('should support labels', () => {
      incCounter('test_labeled', 1, [
        { name: 'method', value: 'GET' },
        { name: 'status', value: '200' },
      ])

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('test_labeled{method="GET",status="200"} 1')
    })

    it('should track separate counters for different label combinations', () => {
      incCounter('http_requests', 1, [{ name: 'method', value: 'GET' }])
      incCounter('http_requests', 1, [{ name: 'method', value: 'POST' }])
      incCounter('http_requests', 1, [{ name: 'method', value: 'GET' }])

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('http_requests{method="GET"} 2')
      expect(output).toContain('http_requests{method="POST"} 1')
    })
  })

  describe('Gauges', () => {
    it('should set gauge value', () => {
      setGauge('test_gauge', 42)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('test_gauge 42')
    })

    it('should overwrite gauge value', () => {
      setGauge('test_gauge_overwrite', 10)
      setGauge('test_gauge_overwrite', 20)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('test_gauge_overwrite 20')
      expect(output).not.toContain('test_gauge_overwrite 10')
    })

    it('should increment gauge', () => {
      setGauge('inc_gauge', 10)
      metrics.incGauge('inc_gauge', 5)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('inc_gauge 15')
    })

    it('should decrement gauge', () => {
      setGauge('dec_gauge', 10)
      metrics.decGauge('dec_gauge', 3)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('dec_gauge 7')
    })

    it('should support labels for gauges', () => {
      setGauge('labeled_gauge', 100, [{ name: 'instance', value: 'app1' }])

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('labeled_gauge{instance="app1"} 100')
    })
  })

  describe('Histograms', () => {
    it('should observe histogram values', () => {
      observeHistogram('test_histogram', 50)
      observeHistogram('test_histogram', 150)
      observeHistogram('test_histogram', 250)

      const output = metrics.getPrometheusFormat()

      // Should have bucket entries
      expect(output).toContain('test_histogram_bucket')
      expect(output).toContain('test_histogram_sum')
      expect(output).toContain('test_histogram_count')
    })

    it('should calculate correct bucket counts', () => {
      // Values: 5, 15, 55, 150, 600
      observeHistogram('bucket_test', 5)
      observeHistogram('bucket_test', 15)
      observeHistogram('bucket_test', 55)
      observeHistogram('bucket_test', 150)
      observeHistogram('bucket_test', 600)

      const output = metrics.getPrometheusFormat()

      // le="10" should have 1 (value 5)
      expect(output).toContain('bucket_test_bucket{le="10"} 1')
      // le="25" should have 2 (values 5, 15)
      expect(output).toContain('bucket_test_bucket{le="25"} 2')
      // le="100" should have 3 (values 5, 15, 55)
      expect(output).toContain('bucket_test_bucket{le="100"} 3')
      // le="250" should have 4 (values 5, 15, 55, 150)
      expect(output).toContain('bucket_test_bucket{le="250"} 4')
      // le="1000" should have 5 (all values)
      expect(output).toContain('bucket_test_bucket{le="1000"} 5')
      // +Inf should have 5 (all values)
      expect(output).toContain('bucket_test_bucket{le="+Inf"} 5')
    })

    it('should calculate sum correctly', () => {
      observeHistogram('sum_test', 10)
      observeHistogram('sum_test', 20)
      observeHistogram('sum_test', 30)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('sum_test_sum 60')
    })

    it('should calculate count correctly', () => {
      observeHistogram('count_test', 10)
      observeHistogram('count_test', 20)
      observeHistogram('count_test', 30)
      observeHistogram('count_test', 40)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('count_test_count 4')
    })

    it('should support labels for histograms', () => {
      observeHistogram('labeled_histogram', 100, [{ name: 'endpoint', value: '/api' }])

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('labeled_histogram_bucket{endpoint="/api"')
    })
  })

  describe('timeAsync', () => {
    it('should time async function and record histogram', async () => {
      const result = await timeAsync('timed_operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'result'
      })

      expect(result).toBe('result')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('timed_operation_count 1')
    })

    it('should record duration even on error', async () => {
      await expect(
        timeAsync('failing_operation', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          throw new Error('test error')
        })
      ).rejects.toThrow('test error')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('failing_operation_count 1')
    })
  })

  describe('Prometheus Format', () => {
    it('should include TYPE comments', () => {
      incCounter('typed_counter')
      setGauge('typed_gauge', 10)
      observeHistogram('typed_histogram', 100)

      const output = metrics.getPrometheusFormat()

      expect(output).toContain('# TYPE typed_counter counter')
      expect(output).toContain('# TYPE typed_gauge gauge')
      expect(output).toContain('# TYPE typed_histogram histogram')
    })

    it('should include HELP comments for known metrics', () => {
      incCounter('xbot_http_requests_total')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('# HELP xbot_http_requests_total')
    })
  })

  describe('collectSystemMetrics', () => {
    it('should collect memory metrics', () => {
      metrics.collectSystemMetrics()

      const output = metrics.getPrometheusFormat()

      // Should have Node.js memory metrics
      expect(output).toContain('xbot_nodejs_heap_used_bytes')
      expect(output).toContain('xbot_nodejs_heap_total_bytes')
      expect(output).toContain('xbot_nodejs_rss_bytes')
    })

    it('should collect cache metrics', () => {
      metrics.collectSystemMetrics()

      const output = metrics.getPrometheusFormat()

      expect(output).toContain('xbot_cache_hits_total')
      expect(output).toContain('xbot_cache_misses_total')
    })
  })

  describe('reset', () => {
    it('should clear all metrics', () => {
      incCounter('to_reset')
      setGauge('gauge_reset', 100)

      metrics.reset()

      const output = metrics.getPrometheusFormat()
      expect(output).not.toContain('to_reset')
      expect(output).not.toContain('gauge_reset')
    })
  })
})

describe('Metric Helpers', () => {
  beforeEach(() => {
    metrics.reset()
  })

  describe('httpMetrics', () => {
    it('should track request total', () => {
      httpMetrics.requestTotal('GET', '/api/users', 200)
      httpMetrics.requestTotal('POST', '/api/users', 201)
      httpMetrics.requestTotal('GET', '/api/users', 200)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_http_requests_total')
    })

    it('should track request duration', () => {
      httpMetrics.requestDuration('GET', '/api/users', 150)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_http_request_duration_ms')
    })
  })

  describe('tweetMetrics', () => {
    it('should track posted tweets', () => {
      tweetMetrics.posted('account-123')
      tweetMetrics.posted('account-123')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_tweets_posted_total')
    })

    it('should track failed tweets with reason', () => {
      tweetMetrics.failed('account-123', 'rate_limit')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_tweets_failed_total')
      expect(output).toContain('reason="rate_limit"')
    })

    it('should track scheduled tweets', () => {
      tweetMetrics.scheduled('account-123')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_tweets_scheduled_total')
    })
  })

  describe('aiMetrics', () => {
    it('should track AI generations', () => {
      aiMetrics.generation('openai', 'tweet')
      aiMetrics.generation('claude', 'reply')

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_ai_generations_total')
      expect(output).toContain('provider="openai"')
      expect(output).toContain('provider="claude"')
    })

    it('should track AI generation duration', () => {
      aiMetrics.generationDuration('openai', 1500)

      const output = metrics.getPrometheusFormat()
      expect(output).toContain('xbot_ai_generation_duration_ms')
    })
  })
})
