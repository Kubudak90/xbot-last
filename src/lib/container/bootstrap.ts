// Container Bootstrap
// Registers all services with the DI container

import { container, ServiceNames } from './index'

// Import actual service implementations
import { HumanBehaviorService } from '@/lib/services/human-behavior'
import { TweetGeneratorService } from '@/lib/services/tweet-generator'
import { StyleAnalyzerService } from '@/lib/services/style-analyzer'
import { TweetScheduler } from '@/lib/scheduler/tweet-scheduler'
import { TweetQueueService } from '@/lib/services/tweet-queue'
import { AnalyticsCollector } from '@/lib/analytics/data-collector'
import { AIProviderManager } from '@/lib/ai/provider-manager'
import { SessionManager } from '@/lib/browser/session-manager'

let isBootstrapped = false

/**
 * Bootstrap the DI container with all services
 * Should be called once at application startup
 */
export function bootstrapContainer(): void {
  if (isBootstrapped) {
    return
  }

  // Register core services as singletons
  container.registerSingleton(ServiceNames.HumanBehavior, () => new HumanBehaviorService())
  container.registerSingleton(ServiceNames.AIProviderManager, () => new AIProviderManager())
  container.registerSingleton(ServiceNames.SessionManager, () => new SessionManager())
  container.registerSingleton(ServiceNames.AnalyticsCollector, () => new AnalyticsCollector())

  // Register services that depend on other services
  container.registerSingleton(ServiceNames.StyleAnalyzer, () => new StyleAnalyzerService())
  container.registerSingleton(ServiceNames.TweetGenerator, () => new TweetGeneratorService())
  container.registerSingleton(ServiceNames.TweetQueue, () => new TweetQueueService())
  container.registerSingleton(ServiceNames.TweetScheduler, () => new TweetScheduler())

  isBootstrapped = true
}

/**
 * Get a service from the container with proper typing
 */
export function getService<T>(name: string): T {
  if (!isBootstrapped) {
    bootstrapContainer()
  }
  return container.resolve<T>(name)
}

// Type-safe service getters for convenient access
export const services = {
  get humanBehavior() {
    return getService<HumanBehaviorService>(ServiceNames.HumanBehavior)
  },
  get tweetGenerator() {
    return getService<TweetGeneratorService>(ServiceNames.TweetGenerator)
  },
  get styleAnalyzer() {
    return getService<StyleAnalyzerService>(ServiceNames.StyleAnalyzer)
  },
  get tweetScheduler() {
    return getService<TweetScheduler>(ServiceNames.TweetScheduler)
  },
  get tweetQueue() {
    return getService<TweetQueueService>(ServiceNames.TweetQueue)
  },
  get analyticsCollector() {
    return getService<AnalyticsCollector>(ServiceNames.AnalyticsCollector)
  },
  get aiProviderManager() {
    return getService<AIProviderManager>(ServiceNames.AIProviderManager)
  },
  get sessionManager() {
    return getService<SessionManager>(ServiceNames.SessionManager)
  },
}
