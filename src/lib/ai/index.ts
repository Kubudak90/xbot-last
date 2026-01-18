// AI Module Exports

export { BaseAIProvider } from './base-provider'
export type { ProviderConfig, ProviderHealth } from './base-provider'

export { OpenAIProvider } from './openai-provider'
export { ClaudeProvider } from './claude-provider'
export { GeminiProvider } from './gemini-provider'
export { OllamaProvider } from './ollama-provider'

export {
  AIProviderManager,
  getAIProviderManager,
  initializeProviders,
} from './provider-manager'

export type {
  ProviderRegistration,
  ManagerConfig,
  GenerationResult,
} from './provider-manager'
