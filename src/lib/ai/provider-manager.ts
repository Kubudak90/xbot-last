// AI Provider Manager with Fallback and Priority System

import { BaseAIProvider, ProviderConfig, ProviderHealth } from './base-provider'
import { OpenAIProvider } from './openai-provider'
import { ClaudeProvider } from './claude-provider'
import { GeminiProvider } from './gemini-provider'
import { OllamaProvider } from './ollama-provider'
import type { AIProviderType, GenerateRequest, GenerateResponse } from '@/types/ai'

export interface ProviderRegistration {
  type: AIProviderType
  config: ProviderConfig
  priority: number // Higher = more preferred
  isActive: boolean
}

export interface ManagerConfig {
  maxRetries: number
  retryDelayMs: number
  healthCheckIntervalMs: number
  enableFallback: boolean
}

export interface GenerationResult {
  response: GenerateResponse
  attempts: Array<{
    provider: AIProviderType
    success: boolean
    error?: string
    latencyMs: number
  }>
}

const DEFAULT_CONFIG: ManagerConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  healthCheckIntervalMs: 60000,
  enableFallback: true,
}

export class AIProviderManager {
  private providers: Map<AIProviderType, BaseAIProvider> = new Map()
  private registrations: Map<AIProviderType, ProviderRegistration> = new Map()
  private healthStatus: Map<AIProviderType, ProviderHealth> = new Map()
  private config: ManagerConfig

  constructor(config: Partial<ManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Register a provider with the manager
   */
  registerProvider(registration: ProviderRegistration): void {
    const { type, config, priority, isActive } = registration

    if (!isActive) {
      this.registrations.set(type, registration)
      return
    }

    try {
      const provider = this.createProvider(type, config)
      this.providers.set(type, provider)
      this.registrations.set(type, registration)

      // Initial health check
      this.checkProviderHealth(type)
    } catch (error) {
      console.error(`Failed to register provider ${type}:`, error)
    }
  }

  /**
   * Create a provider instance based on type
   */
  private createProvider(type: AIProviderType, config: ProviderConfig): BaseAIProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'claude':
        return new ClaudeProvider(config)
      case 'gemini':
        return new GeminiProvider(config)
      case 'ollama':
        return new OllamaProvider(config)
      default:
        throw new Error(`Unknown provider type: ${type}`)
    }
  }

  /**
   * Get active providers sorted by priority (highest first)
   */
  getActiveProviders(): AIProviderType[] {
    return Array.from(this.registrations.entries())
      .filter(([type, reg]) => reg.isActive && this.providers.has(type))
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([type]) => type)
  }

  /**
   * Get healthy providers sorted by priority
   */
  getHealthyProviders(): AIProviderType[] {
    return this.getActiveProviders().filter(type => {
      const health = this.healthStatus.get(type)
      return health?.isHealthy !== false
    })
  }

  /**
   * Generate content with automatic fallback
   */
  async generate(
    request: GenerateRequest,
    preferredProvider?: AIProviderType
  ): Promise<GenerationResult> {
    const attempts: GenerationResult['attempts'] = []

    // Build provider order
    let providerOrder = this.getHealthyProviders()

    // If preferred provider specified, try it first
    if (preferredProvider && this.providers.has(preferredProvider)) {
      providerOrder = [
        preferredProvider,
        ...providerOrder.filter(p => p !== preferredProvider),
      ]
    }

    if (providerOrder.length === 0) {
      throw new Error('No healthy AI providers available')
    }

    // Try each provider in order
    for (const providerType of providerOrder) {
      const provider = this.providers.get(providerType)
      if (!provider) continue

      for (let retry = 0; retry < this.config.maxRetries; retry++) {
        const start = Date.now()

        try {
          const response = await provider.generate(request)

          attempts.push({
            provider: providerType,
            success: true,
            latencyMs: Date.now() - start,
          })

          return { response, attempts }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          attempts.push({
            provider: providerType,
            success: false,
            error: errorMessage,
            latencyMs: Date.now() - start,
          })

          // Wait before retry
          if (retry < this.config.maxRetries - 1) {
            await this.delay(this.config.retryDelayMs * (retry + 1))
          }
        }
      }

      // If fallback disabled, don't try other providers
      if (!this.config.enableFallback) break

      // Mark provider as potentially unhealthy
      this.healthStatus.set(providerType, {
        isHealthy: false,
        lastChecked: new Date(),
        error: 'Generation failed',
      })
    }

    throw new Error(
      `All providers failed. Attempts: ${JSON.stringify(attempts)}`
    )
  }

  /**
   * Generate content with specific provider (no fallback)
   */
  async generateWithProvider(
    request: GenerateRequest,
    providerType: AIProviderType
  ): Promise<GenerateResponse> {
    const provider = this.providers.get(providerType)

    if (!provider) {
      throw new Error(`Provider ${providerType} not registered or inactive`)
    }

    return provider.generate(request)
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(type: AIProviderType): Promise<ProviderHealth> {
    const provider = this.providers.get(type)

    if (!provider) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        error: 'Provider not registered',
      }
    }

    const health = await provider.healthCheck()
    this.healthStatus.set(type, health)
    return health
  }

  /**
   * Check health of all registered providers
   */
  async checkAllProvidersHealth(): Promise<Map<AIProviderType, ProviderHealth>> {
    const healthPromises = Array.from(this.providers.keys()).map(async type => {
      const health = await this.checkProviderHealth(type)
      return [type, health] as [AIProviderType, ProviderHealth]
    })

    const results = await Promise.all(healthPromises)
    return new Map(results)
  }

  /**
   * Get current health status
   */
  getHealthStatus(): Map<AIProviderType, ProviderHealth> {
    return new Map(this.healthStatus)
  }

  /**
   * Get provider by type
   */
  getProvider(type: AIProviderType): BaseAIProvider | undefined {
    return this.providers.get(type)
  }

  /**
   * Update provider configuration
   */
  updateProvider(type: AIProviderType, updates: Partial<ProviderRegistration>): void {
    const existing = this.registrations.get(type)
    if (!existing) {
      throw new Error(`Provider ${type} not found`)
    }

    const updated = { ...existing, ...updates }
    this.registrations.set(type, updated)

    // Re-create provider if config changed
    if (updates.config) {
      try {
        const provider = this.createProvider(type, updated.config)
        this.providers.set(type, provider)
      } catch (error) {
        console.error(`Failed to update provider ${type}:`, error)
      }
    }

    // Remove provider if deactivated
    if (updates.isActive === false) {
      this.providers.delete(type)
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(type: AIProviderType): void {
    this.providers.delete(type)
    this.registrations.delete(type)
    this.healthStatus.delete(type)
  }

  /**
   * Get statistics for all providers
   */
  getProviderStats(): Array<{
    type: AIProviderType
    name: string
    modelId: string
    priority: number
    isActive: boolean
    isHealthy: boolean
    lastHealthCheck?: Date
  }> {
    return Array.from(this.registrations.entries()).map(([type, reg]) => {
      const provider = this.providers.get(type)
      const health = this.healthStatus.get(type)

      return {
        type,
        name: provider?.getName() || type,
        modelId: reg.config.modelId,
        priority: reg.priority,
        isActive: reg.isActive,
        isHealthy: health?.isHealthy ?? false,
        lastHealthCheck: health?.lastChecked,
      }
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
let managerInstance: AIProviderManager | null = null

export function getAIProviderManager(config?: Partial<ManagerConfig>): AIProviderManager {
  if (!managerInstance) {
    managerInstance = new AIProviderManager(config)
  }
  return managerInstance
}

export function initializeProviders(): AIProviderManager {
  const manager = getAIProviderManager()

  // Register OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    manager.registerProvider({
      type: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        modelId: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      },
      priority: 100,
      isActive: true,
    })
  }

  // Register Claude if configured
  if (process.env.ANTHROPIC_API_KEY) {
    manager.registerProvider({
      type: 'claude',
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        modelId: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      },
      priority: 90,
      isActive: true,
    })
  }

  // Register Gemini if configured
  if (process.env.GOOGLE_AI_API_KEY) {
    manager.registerProvider({
      type: 'gemini',
      config: {
        apiKey: process.env.GOOGLE_AI_API_KEY,
        modelId: process.env.GOOGLE_AI_MODEL || 'gemini-pro',
      },
      priority: 80,
      isActive: true,
    })
  }

  // Register Ollama if configured
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_ENABLED === 'true') {
    manager.registerProvider({
      type: 'ollama',
      config: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        modelId: process.env.OLLAMA_MODEL || 'llama2',
      },
      priority: 50,
      isActive: true,
    })
  }

  return manager
}
