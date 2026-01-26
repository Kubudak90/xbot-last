// Webhook System
// Sends notifications to configured webhook URLs for various events

import crypto from 'crypto'
import { createLogger } from '@/lib/logger'
import { retry, RetryPresets } from '@/lib/retry'

const logger = createLogger('webhooks')

export type WebhookEventType =
  | 'tweet.posted'
  | 'tweet.failed'
  | 'tweet.scheduled'
  | 'account.created'
  | 'account.login'
  | 'account.suspended'
  | 'ai.generated'
  | 'ai.error'
  | 'rate_limit.exceeded'
  | 'system.error'

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  data: Record<string, unknown>
}

export interface WebhookConfig {
  url: string
  secret?: string           // For signature verification
  events: WebhookEventType[] // Events to send
  enabled: boolean
  retryCount?: number
}

export interface WebhookResult {
  success: boolean
  statusCode?: number
  error?: string
  duration: number
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Send webhook request
 */
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<WebhookResult> {
  const startTime = Date.now()
  const body = JSON.stringify(payload)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'XBot-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': payload.timestamp,
  }

  // Add signature if secret is configured
  if (secret) {
    headers['X-Webhook-Signature'] = `sha256=${generateSignature(body, secret)}`
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        duration,
      }
    }

    return {
      success: true,
      statusCode: response.status,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Webhook Manager
 */
class WebhookManager {
  private webhooks: WebhookConfig[] = []

  constructor() {
    this.loadFromEnv()
  }

  /**
   * Load webhook configs from environment
   */
  private loadFromEnv(): void {
    // Support multiple webhooks via WEBHOOK_URL_1, WEBHOOK_URL_2, etc.
    // Or single WEBHOOK_URL
    const singleUrl = process.env.WEBHOOK_URL
    const singleSecret = process.env.WEBHOOK_SECRET
    const singleEvents = process.env.WEBHOOK_EVENTS

    if (singleUrl) {
      this.webhooks.push({
        url: singleUrl,
        secret: singleSecret,
        events: singleEvents
          ? (singleEvents.split(',') as WebhookEventType[])
          : ['tweet.posted', 'tweet.failed', 'system.error'],
        enabled: true,
      })
    }

    // Check for numbered webhooks
    for (let i = 1; i <= 5; i++) {
      const url = process.env[`WEBHOOK_URL_${i}`]
      if (url) {
        this.webhooks.push({
          url,
          secret: process.env[`WEBHOOK_SECRET_${i}`],
          events: (process.env[`WEBHOOK_EVENTS_${i}`]?.split(',') as WebhookEventType[]) || [
            'tweet.posted',
          ],
          enabled: true,
        })
      }
    }

    if (this.webhooks.length > 0) {
      logger.info('Webhooks loaded', { count: this.webhooks.length })
    }
  }

  /**
   * Register a webhook programmatically
   */
  register(config: WebhookConfig): void {
    this.webhooks.push(config)
    logger.info('Webhook registered', { url: config.url, events: config.events })
  }

  /**
   * Unregister a webhook
   */
  unregister(url: string): boolean {
    const index = this.webhooks.findIndex((w) => w.url === url)
    if (index !== -1) {
      this.webhooks.splice(index, 1)
      logger.info('Webhook unregistered', { url })
      return true
    }
    return false
  }

  /**
   * Send event to all matching webhooks
   */
  async emit(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    // Find webhooks subscribed to this event
    const matchingWebhooks = this.webhooks.filter(
      (w) => w.enabled && w.events.includes(event)
    )

    if (matchingWebhooks.length === 0) {
      return
    }

    logger.debug('Emitting webhook event', { event, webhookCount: matchingWebhooks.length })

    // Send to all matching webhooks in parallel
    const results = await Promise.allSettled(
      matchingWebhooks.map((webhook) => this.sendWithRetry(webhook, payload))
    )

    // Log results
    results.forEach((result, index) => {
      const webhook = matchingWebhooks[index]
      if (result.status === 'fulfilled' && result.value.success) {
        logger.debug('Webhook sent', {
          url: webhook.url,
          event,
          duration: result.value.duration,
        })
      } else {
        const error =
          result.status === 'rejected' ? result.reason : result.value.error
        logger.warn('Webhook failed', {
          url: webhook.url,
          event,
          error,
        })
      }
    })
  }

  /**
   * Send webhook with retry
   */
  private async sendWithRetry(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<WebhookResult> {
    const result = await retry(
      () => sendWebhook(webhook.url, payload, webhook.secret),
      {
        ...RetryPresets.quick,
        maxRetries: webhook.retryCount ?? 2,
      }
    )

    if (result.success && result.data) {
      return result.data
    }

    return {
      success: false,
      error: result.error?.message || 'Retry failed',
      duration: result.totalDelayMs,
    }
  }

  /**
   * Get registered webhooks
   */
  getWebhooks(): WebhookConfig[] {
    return [...this.webhooks]
  }

  /**
   * Test a webhook
   */
  async test(url: string): Promise<WebhookResult> {
    const payload: WebhookPayload = {
      event: 'system.error',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'Webhook test from XBot',
      },
    }

    return sendWebhook(url, payload)
  }
}

// Singleton instance
export const webhookManager = new WebhookManager()

// Convenience functions
export const emitWebhook = (event: WebhookEventType, data: Record<string, unknown>) =>
  webhookManager.emit(event, data)

// Event-specific helpers
export const webhookEvents = {
  tweetPosted: (tweetId: string, content: string, accountId: string) =>
    emitWebhook('tweet.posted', { tweetId, content, accountId }),

  tweetFailed: (tweetId: string, error: string, accountId: string) =>
    emitWebhook('tweet.failed', { tweetId, error, accountId }),

  tweetScheduled: (tweetId: string, scheduledFor: Date, accountId: string) =>
    emitWebhook('tweet.scheduled', { tweetId, scheduledFor: scheduledFor.toISOString(), accountId }),

  accountCreated: (accountId: string, username: string) =>
    emitWebhook('account.created', { accountId, username }),

  accountLogin: (accountId: string, username: string) =>
    emitWebhook('account.login', { accountId, username }),

  aiGenerated: (accountId: string, type: string, provider: string) =>
    emitWebhook('ai.generated', { accountId, type, provider }),

  aiError: (accountId: string, provider: string, error: string) =>
    emitWebhook('ai.error', { accountId, provider, error }),

  rateLimitExceeded: (clientId: string, endpoint: string) =>
    emitWebhook('rate_limit.exceeded', { clientId, endpoint }),

  systemError: (error: string, context?: Record<string, unknown>) =>
    emitWebhook('system.error', { error, ...context }),
}

export default webhookManager
