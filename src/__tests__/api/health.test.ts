/**
 * @jest-environment node
 */

import { GET } from '@/app/api/health/route'
import { GET as getMetrics } from '@/app/api/health/metrics/route'
import { NextRequest } from 'next/server'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  },
}))

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  performanceTracker: {
    getMetricSummary: jest.fn().mockReturnValue({
      count: 100,
      avg: 150,
      min: 10,
      max: 500,
      p50: 120,
      p95: 400,
      p99: 480,
    }),
    getMetricNames: jest.fn().mockReturnValue(['http_requests', 'db_queries']),
    getFormattedUptime: jest.fn().mockReturnValue('1d 2h 30m'),
  },
}))

// Mock metrics
jest.mock('@/lib/metrics', () => ({
  metrics: {
    collectSystemMetrics: jest.fn(),
    getPrometheusFormat: jest.fn().mockReturnValue(
      `# HELP xbot_http_requests_total Total HTTP requests
# TYPE xbot_http_requests_total counter
xbot_http_requests_total 1000`
    ),
  },
}))

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data).toHaveProperty('timestamp')
    })

    it('should include database check', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.checks).toHaveProperty('database')
      expect(data.checks.database).toBe('ok')
    })

    it('should include version info', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('version')
    })
  })

  describe('GET /api/health/metrics', () => {
    it('should return JSON metrics by default', async () => {
      const request = new NextRequest('http://localhost/api/health/metrics')

      const response = await getMetrics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('metrics')
    })

    it('should return Prometheus format when requested', async () => {
      const request = new NextRequest('http://localhost/api/health/metrics?format=prometheus')

      const response = await getMetrics(request)
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')
      expect(text).toContain('# HELP')
      expect(text).toContain('# TYPE')
    })

    it('should return specific metric when name provided', async () => {
      const request = new NextRequest('http://localhost/api/health/metrics?name=http_requests')

      const response = await getMetrics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.name).toBe('http_requests')
    })

    it('should support custom time window', async () => {
      const request = new NextRequest('http://localhost/api/health/metrics?window=300000')

      const response = await getMetrics(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.windowMs).toBe(300000)
    })

    it('should include uptime in response', async () => {
      const request = new NextRequest('http://localhost/api/health/metrics')

      const response = await getMetrics(request)
      const data = await response.json()

      expect(data.data).toHaveProperty('uptime')
    })
  })
})
