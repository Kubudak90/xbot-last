// Simple Dependency Injection Container
// Provides centralized service management and easy testing

type ServiceFactory<T> = () => T

interface ServiceDescriptor<T> {
  factory: ServiceFactory<T>
  instance?: T
  singleton: boolean
}

class Container {
  private services: Map<string, ServiceDescriptor<unknown>> = new Map()

  /**
   * Register a singleton service (created once, reused)
   */
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      factory,
      singleton: true,
    })
  }

  /**
   * Register a transient service (created each time)
   */
  registerTransient<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      factory,
      singleton: false,
    })
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      instance,
      singleton: true,
    })
  }

  /**
   * Get a service by name
   */
  resolve<T>(name: string): T {
    const descriptor = this.services.get(name)

    if (!descriptor) {
      throw new Error(`Service '${name}' not registered`)
    }

    if (descriptor.singleton) {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory()
      }
      return descriptor.instance as T
    }

    return descriptor.factory() as T
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name)
  }

  /**
   * Replace a service (useful for testing)
   */
  replace<T>(name: string, instance: T): void {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not registered`)
    }

    const descriptor = this.services.get(name)!
    descriptor.instance = instance
  }

  /**
   * Reset a service to create a new instance
   */
  reset(name: string): void {
    const descriptor = this.services.get(name)
    if (descriptor) {
      descriptor.instance = undefined
    }
  }

  /**
   * Reset all services
   */
  resetAll(): void {
    for (const descriptor of this.services.values()) {
      descriptor.instance = undefined
    }
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear()
  }
}

// Global container instance
export const container = new Container()

// Service names as constants for type safety
export const ServiceNames = {
  HumanBehavior: 'HumanBehavior',
  TweetGenerator: 'TweetGenerator',
  StyleAnalyzer: 'StyleAnalyzer',
  TweetScheduler: 'TweetScheduler',
  TweetQueue: 'TweetQueue',
  AnalyticsCollector: 'AnalyticsCollector',
  AIProviderManager: 'AIProviderManager',
  SessionManager: 'SessionManager',
} as const

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames]
