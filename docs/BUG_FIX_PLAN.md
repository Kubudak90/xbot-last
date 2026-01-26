# XBot - Bug Fix ve İyileştirme Planı

**Tarih:** 2026-01-26
**Versiyon:** 2.0
**Kod Review Sonucu:** 7.5/10

---

## Özet

Bu plan, kod review sonucunda tespit edilen hataların ve eksiklerin düzeltilmesi için hazırlanmıştır. Toplam **11 sorun** tespit edilmiş olup, bunlar öncelik sırasına göre gruplandırılmıştır.

---

## P0 - Kritik Öncelikli (Hemen Düzeltilmeli)

### 1. Test-Service API Uyumsuzluğu

**Dosya:** `src/__tests__/services/tweet-generator.test.ts`
**Sorun:** Testler `generate()` metodunu çağırıyor, ancak service `generateTweet()` sunuyor.

**Mevcut Kod (Hatalı):**
```typescript
// Test dosyası - Satır 49-55
const result = await generator.generate('account-1', {})
```

**Düzeltme:**
```typescript
// Düzeltilmiş test
describe('TweetGeneratorService', () => {
  let generator: TweetGeneratorService

  beforeEach(() => {
    generator = new TweetGeneratorService()
    jest.clearAllMocks()
  })

  describe('generateTweet', () => {
    it('should generate a tweet with default options', async () => {
      const result = await generator.generateTweet({
        type: 'original',
        topic: 'technology',
      })

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.content.length).toBeLessThanOrEqual(280)
    })

    it('should generate a tweet with specific type', async () => {
      const result = await generator.generateTweet({
        type: 'informative',
        topic: 'AI trends',
      })

      expect(result.content).toBeDefined()
    })

    it('should respect max length constraint', async () => {
      const result = await generator.generateTweet({
        type: 'original',
        topic: 'short tweet',
        maxLength: 100,
      })

      expect(result.content.length).toBeLessThanOrEqual(100)
    })
  })

  describe('generateThread', () => {
    it('should generate a thread with multiple tweets', async () => {
      const thread = await generator.generateThread({
        topic: 'AI trends',
        tweetCount: 3,
      })

      expect(Array.isArray(thread.tweets)).toBe(true)
      expect(thread.tweets.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('analyzeTweet', () => {
    it('should analyze tweet content', () => {
      const analysis = generator.analyzeTweet('This is a test tweet #test')

      expect(analysis.characterCount).toBeDefined()
      expect(analysis.wordCount).toBeDefined()
      expect(analysis.hashtags).toContain('#test')
    })
  })

  describe('validateTweet', () => {
    it('should validate tweet length', () => {
      const validTweet = 'This is a valid tweet'
      const invalidTweet = 'a'.repeat(300)

      expect(generator.validateTweet(validTweet)).toBe(true)
      expect(generator.validateTweet(invalidTweet)).toBe(false)
    })

    it('should reject empty tweets', () => {
      expect(generator.validateTweet('')).toBe(false)
      expect(generator.validateTweet('   ')).toBe(false)
    })
  })
})
```

**Etkilenen Dosyalar:**
- `src/__tests__/services/tweet-generator.test.ts`
- Potansiyel olarak diğer test dosyaları da kontrol edilmeli

---

### 2. JSON.parse Güvenlik Açığı

**Dosya:** `src/app/api/tweets/generate/route.ts:44-48`
**Sorun:** JSON.parse hata yönetimi olmadan kullanılıyor.

**Mevcut Kod (Hatalı):**
```typescript
if (dbProfile) {
  styleProfile = {
    id: dbProfile.id,
    accountId: dbProfile.accountId,
    toneAnalysis: JSON.parse(dbProfile.toneAnalysis),
    vocabularyStyle: JSON.parse(dbProfile.vocabularyStyle),
    topicPreferences: JSON.parse(dbProfile.topicPreferences),
    postingPatterns: JSON.parse(dbProfile.postingPatterns),
    emojiUsage: dbProfile.emojiUsage ? JSON.parse(dbProfile.emojiUsage) : undefined,
    // ...
  }
}
```

**Düzeltme:**
```typescript
// Güvenli JSON parse helper fonksiyonu
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch (error) {
    console.error('JSON parse error:', error)
    return fallback
  }
}

// Kullanım
if (dbProfile) {
  styleProfile = {
    id: dbProfile.id,
    accountId: dbProfile.accountId,
    toneAnalysis: safeJsonParse(dbProfile.toneAnalysis, {
      formal: 0.5, casual: 0.5, humorous: 0, serious: 0.5,
      inspirational: 0, sarcastic: 0, confident: 0.5, engaging: 0.5
    }),
    vocabularyStyle: safeJsonParse(dbProfile.vocabularyStyle, {
      averageWordLength: 5, hashtagUsage: 0, emojiUsage: 0,
      commonWords: [], commonPhrases: []
    }),
    topicPreferences: safeJsonParse(dbProfile.topicPreferences, []),
    postingPatterns: safeJsonParse(dbProfile.postingPatterns, {
      preferredHours: [], preferredDays: [], averageFrequency: 0
    }),
    emojiUsage: safeJsonParse(dbProfile.emojiUsage, undefined),
    analyzedTweets: dbProfile.analyzedTweets,
    lastAnalyzedAt: dbProfile.lastAnalyzedAt || undefined,
  }
}
```

**Yeni Dosya Oluştur:** `src/lib/utils/safe-json.ts`
```typescript
// src/lib/utils/safe-json.ts
import { logger } from '@/lib/logger'

export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
  context?: string
): T {
  if (!json) return fallback

  try {
    return JSON.parse(json) as T
  } catch (error) {
    logger.warn({
      message: 'JSON parse failed',
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      jsonPreview: json.substring(0, 100)
    })
    return fallback
  }
}

export function safeJsonStringify(
  data: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(data)
  } catch (error) {
    logger.warn({
      message: 'JSON stringify failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return fallback
  }
}
```

**Etkilenen Dosyalar:**
- `src/app/api/tweets/generate/route.ts`
- `src/app/api/ai/generate/route.ts`
- `src/lib/services/style-analyzer.ts`
- Tüm JSON.parse kullanan dosyalar

---

### 3. Reply Endpoint Account Kontrolü Eksik

**Dosya:** `src/app/api/browser/post/route.ts`
**Sorun:** `reply` ve `retweet` action'larında account varlık kontrolü yapılmıyor.

**Mevcut Kod (Hatalı):**
```typescript
case 'reply': {
  const data = PostReplySchema.parse(body)
  // Account kontrolü YOK!
  const xAutomation = createXAutomation(data.accountId)
  // ...
}
```

**Düzeltme:**
```typescript
case 'reply': {
  const data = PostReplySchema.parse(body)

  // Account kontrolü ekle
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
  })

  if (!account) {
    return NextResponse.json(
      { error: 'Account not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  if (account.status === 'suspended' || account.status === 'error') {
    return NextResponse.json(
      { error: `Account is ${account.status}`, code: 'ACCOUNT_UNAVAILABLE' },
      { status: 400 }
    )
  }

  const xAutomation = createXAutomation(data.accountId)
  // ...
}

case 'retweet': {
  const data = PostRetweetSchema.parse(body)

  // Aynı kontrol
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
  })

  if (!account) {
    return NextResponse.json(
      { error: 'Account not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  if (account.status === 'suspended' || account.status === 'error') {
    return NextResponse.json(
      { error: `Account is ${account.status}`, code: 'ACCOUNT_UNAVAILABLE' },
      { status: 400 }
    )
  }

  const xAutomation = createXAutomation(data.accountId)
  // ...
}
```

**Daha İyi Çözüm - Helper Fonksiyon:**
```typescript
// src/lib/utils/account-validator.ts
import prisma from '@/lib/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'

export async function validateAccountForAction(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new NotFoundError('Account', accountId)
  }

  if (account.status === 'suspended') {
    throw new ValidationError('Account is suspended')
  }

  if (account.status === 'error') {
    throw new ValidationError('Account is in error state')
  }

  if (!account.isActive) {
    throw new ValidationError('Account is inactive')
  }

  return account
}
```

---

## P1 - Yüksek Öncelikli (1-2 Hafta İçinde)

### 4. Browser Selector Fallback Mekanizması

**Dosya:** `src/lib/browser/x-automation.ts:212-218`
**Sorun:** Twitter UI değişirse tüm selector'lar kırılır.

**Düzeltme:**
```typescript
// src/lib/browser/selectors.ts
export const SELECTORS = {
  composeButton: {
    primary: '[data-testid="SideNav_NewTweet_Button"]',
    fallbacks: [
      'a[href="/compose/tweet"]',
      '[aria-label="Tweet"]',
      '[aria-label="Post"]',
      'button[data-testid="tweetButtonInline"]'
    ]
  },
  tweetInput: {
    primary: '[data-testid="tweetTextarea_0"]',
    fallbacks: [
      '[data-testid="tweetTextarea_0_label"]',
      'div[role="textbox"][data-testid]',
      '.DraftEditor-root',
      '[contenteditable="true"]'
    ]
  },
  tweetButton: {
    primary: '[data-testid="tweetButton"]',
    fallbacks: [
      '[data-testid="tweetButtonInline"]',
      'button[type="submit"]',
      '[role="button"][data-testid*="tweet"]'
    ]
  },
  replyInput: {
    primary: '[data-testid="tweetTextarea_0"]',
    fallbacks: [
      '[data-testid="tweetTextarea_1"]',
      'div[role="textbox"]'
    ]
  }
}

// Helper function
export async function findElement(
  page: Page,
  selectorConfig: { primary: string; fallbacks: string[] },
  options: { timeout?: number } = {}
): Promise<ElementHandle | null> {
  const timeout = options.timeout || 5000

  // Primary selector'ı dene
  try {
    const element = await page.waitForSelector(selectorConfig.primary, { timeout })
    if (element) return element
  } catch {
    // Primary başarısız, fallback'lere geç
  }

  // Fallback'leri dene
  for (const selector of selectorConfig.fallbacks) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 1000 })
      if (element) {
        logger.info({
          message: 'Using fallback selector',
          primary: selectorConfig.primary,
          fallback: selector
        })
        return element
      }
    } catch {
      continue
    }
  }

  logger.error({
    message: 'All selectors failed',
    primary: selectorConfig.primary,
    fallbacks: selectorConfig.fallbacks
  })

  return null
}
```

---

### 5. Thread Parse Regex Düzeltmesi

**Dosya:** `src/lib/services/tweet-generator.ts:528-551`
**Sorun:** Mevcut regex bazı formatları yanlış parse edebilir.

**Düzeltme:**
```typescript
private parseThreadResponse(response: string, tweetCount: number): string[] {
  const tweets: string[] = []

  // Daha robust regex - farklı formatları destekler
  const patterns = [
    // Format: "1/5 Tweet content" veya "1/5: Tweet content"
    /(?:^|\n)(\d+)\/\d+[:\s]+(.+?)(?=\n\d+\/\d+|$)/gs,
    // Format: "[1] Tweet content" veya "(1) Tweet content"
    /(?:^|\n)[\[(](\d+)[\])][:\s]*(.+?)(?=\n[\[(]\d+|$)/gs,
    // Format: "Tweet 1: content"
    /(?:^|\n)Tweet\s+(\d+)[:\s]+(.+?)(?=\nTweet\s+\d+|$)/gis,
    // Format: "1. Tweet content"
    /(?:^|\n)(\d+)\.\s+(.+?)(?=\n\d+\.|$)/gs,
  ]

  for (const pattern of patterns) {
    const matches = [...response.matchAll(pattern)]

    if (matches.length >= 2) {
      // İlk eşleşen pattern'i kullan
      for (const match of matches) {
        const content = match[2].trim()
        if (content && content.length <= 280) {
          tweets.push(content)
        }
      }

      if (tweets.length >= 2) {
        return tweets.slice(0, tweetCount)
      }
    }
  }

  // Fallback: Satır bazlı parse
  const lines = response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length <= 280)
    .filter(line => !line.match(/^\d+[\/\.\)]/)) // Numara satırlarını atla

  if (lines.length >= 2) {
    return lines.slice(0, tweetCount)
  }

  // Son çare: Tek uzun metni böl
  return this.splitIntoTweets(response, tweetCount)
}

private splitIntoTweets(text: string, count: number): string[] {
  const tweets: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim())

  let currentTweet = ''

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    if ((currentTweet + ' ' + trimmed).length <= 270) {
      currentTweet = currentTweet ? currentTweet + '. ' + trimmed : trimmed
    } else {
      if (currentTweet) {
        tweets.push(currentTweet + '.')
      }
      currentTweet = trimmed
    }

    if (tweets.length >= count) break
  }

  if (currentTweet && tweets.length < count) {
    tweets.push(currentTweet + '.')
  }

  return tweets
}
```

---

### 6. Reply Reading Time Düzeltmesi

**Dosya:** `src/lib/browser/x-automation.ts:308`
**Sorun:** Reply için yanlış content ile okuma süresi hesaplanıyor.

**Düzeltme:**
```typescript
async postReply(tweetUrl: string, content: string): Promise<PostResult> {
  // ...

  // Önce orijinal tweet'i oku
  const originalTweetContent = await this.extractOriginalTweetContent(page)

  // Okuma süresi orijinal tweet için hesaplanmalı
  const readingTime = humanBehavior.getReadingTime(originalTweetContent || content)

  // İnsan gibi tweet'i oku
  await humanBehavior.simulateReading(readingTime)

  // ...
}

private async extractOriginalTweetContent(page: Page): Promise<string | null> {
  try {
    const tweetTextSelector = '[data-testid="tweetText"]'
    const tweetElement = await page.$(tweetTextSelector)

    if (tweetElement) {
      return await tweetElement.textContent()
    }
  } catch {
    // Ignore extraction errors
  }
  return null
}
```

---

## P2 - Orta Öncelikli (2-4 Hafta İçinde)

### 7. Alternative Generation Paralel Hale Getirme

**Dosya:** `src/lib/services/tweet-generator.ts:591-609`
**Sorun:** Alternative'ler seri üretiliyor, yavaş ve maliyetli.

**Düzeltme:**
```typescript
async generateAlternatives(
  originalTweet: GeneratedTweet,
  count: number = 3,
  styleProfile?: StyleProfile
): Promise<GeneratedTweet[]> {
  const alternatives: GeneratedTweet[] = []

  // Paralel üretim için Promise.allSettled kullan
  const promises = Array.from({ length: count }, (_, i) =>
    this.generateSingleAlternative(originalTweet, i, styleProfile)
  )

  const results = await Promise.allSettled(promises)

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      alternatives.push(result.value)
    } else if (result.status === 'rejected') {
      logger.warn({
        message: 'Alternative generation failed',
        error: result.reason
      })
    }
  }

  return alternatives
}

private async generateSingleAlternative(
  originalTweet: GeneratedTweet,
  index: number,
  styleProfile?: StyleProfile
): Promise<GeneratedTweet | null> {
  try {
    const variations = ['more casual', 'more professional', 'with humor', 'shorter', 'with question']
    const variation = variations[index % variations.length]

    const result = await this.manager.generate({
      prompt: `Rewrite this tweet to be ${variation}:\n\n"${originalTweet.content}"`,
      maxTokens: 100,
    })

    return {
      content: result.content,
      type: originalTweet.type,
      characterCount: result.content.length,
      hashtags: this.extractHashtags(result.content),
      mentions: this.extractMentions(result.content),
      hasEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(result.content),
      styleScore: styleProfile ? this.calculateStyleScore(result.content, styleProfile) : undefined,
      metadata: {
        provider: result.provider,
        model: result.model,
        variation,
        isAlternative: true,
        originalContent: originalTweet.content,
      },
    }
  } catch (error) {
    logger.error({
      message: 'Failed to generate alternative',
      index,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}
```

---

### 8. Human Score Edge Case Düzeltmesi

**Dosya:** `src/lib/services/style-analyzer.ts:562-611`
**Sorun:** Tek tweetli hesaplarda her zaman 0.5 score dönüyor.

**Düzeltme:**
```typescript
private calculateHumanScore(
  tweets: TweetData[],
  intervals: number[],
  sentimentVariation: number
): number {
  let score = 0.5 // Başlangıç puanı

  // Tek tweet durumu - diğer faktörlere bak
  if (tweets.length === 1) {
    const tweet = tweets[0]

    // Tweet içeriğine göre puan ver
    if (tweet.text.length > 50 && tweet.text.length < 250) score += 0.1
    if (this.hasNaturalPunctuation(tweet.text)) score += 0.1
    if (this.hasVariedWordLength(tweet.text)) score += 0.1

    // Minimum ve maksimum sınırla
    return Math.min(0.8, Math.max(0.3, score))
  }

  // Çoklu tweet durumu - mevcut mantık
  if (intervals.length > 0) {
    // Interval çeşitliliği kontrolü
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const intervalVariation = intervals.reduce((acc, i) =>
      acc + Math.abs(i - avgInterval), 0) / intervals.length

    // Bot'lar genellikle çok düzenli aralıklarla paylaşır
    if (intervalVariation > avgInterval * 0.3) {
      score += 0.15 // Düzensiz aralıklar = daha insan
    }

    // Çok düzenli aralıklar şüpheli
    if (intervalVariation < avgInterval * 0.1) {
      score -= 0.15
    }
  }

  // Sentiment çeşitliliği
  if (sentimentVariation > 0.3) {
    score += 0.1
  }

  // Tweet uzunluk çeşitliliği
  const lengths = tweets.map(t => t.text.length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const lengthVariation = lengths.reduce((acc, l) =>
    acc + Math.abs(l - avgLength), 0) / lengths.length

  if (lengthVariation > 30) {
    score += 0.1
  }

  return Math.min(1, Math.max(0, score))
}

private hasNaturalPunctuation(text: string): boolean {
  const punctuationCount = (text.match(/[.!?,;:]/g) || []).length
  const wordCount = text.split(/\s+/).length
  return punctuationCount > 0 && punctuationCount / wordCount < 0.5
}

private hasVariedWordLength(text: string): boolean {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const lengths = words.map(w => w.length)
  const uniqueLengths = new Set(lengths)
  return uniqueLengths.size >= Math.min(5, words.length * 0.3)
}
```

---

### 9. Singleton Race Condition Düzeltmesi

**Dosya:** `src/lib/ai/provider-manager.ts:366-371`
**Sorun:** Concurrent request'lerde config ignore edilebilir.

**Düzeltme:**
```typescript
// Thread-safe singleton with config validation
let managerInstance: AIProviderManager | null = null
let instanceConfig: Partial<ManagerConfig> | null = null

export function getAIProviderManager(config?: Partial<ManagerConfig>): AIProviderManager {
  // İlk çağrı - instance oluştur
  if (!managerInstance) {
    managerInstance = new AIProviderManager(config)
    instanceConfig = config || null
    return managerInstance
  }

  // Config farklıysa uyar (development için)
  if (config && instanceConfig && JSON.stringify(config) !== JSON.stringify(instanceConfig)) {
    logger.warn({
      message: 'AIProviderManager already initialized with different config',
      existingConfig: instanceConfig,
      requestedConfig: config,
      hint: 'First initialization wins. Consider using resetAIProviderManager() if you need different config.'
    })
  }

  return managerInstance
}

// Test ve config değişikliği için reset fonksiyonu
export function resetAIProviderManager(): void {
  if (managerInstance) {
    // Cleanup if needed
    managerInstance = null
    instanceConfig = null
    logger.info({ message: 'AIProviderManager instance reset' })
  }
}

// Alternatif: Factory pattern ile named instances
const managerInstances = new Map<string, AIProviderManager>()

export function getNamedAIProviderManager(
  name: string = 'default',
  config?: Partial<ManagerConfig>
): AIProviderManager {
  if (!managerInstances.has(name)) {
    managerInstances.set(name, new AIProviderManager(config))
  }
  return managerInstances.get(name)!
}
```

---

## P3 - Düşük Öncelikli (Backlog)

### 10. Boş Catch Bloklarına Loglama Ekleme

**Etkilenen Dosyalar:** Birden fazla

**Düzeltme Örneği:**
```typescript
// ÖNCE (Hatalı)
} catch {
  // Skip failed alternatives
}

// SONRA (Düzeltilmiş)
} catch (error) {
  logger.debug({
    message: 'Alternative generation skipped',
    reason: error instanceof Error ? error.message : 'Unknown error',
    // Gerekirse daha fazla context
  })
}
```

**Toplu Düzeltme Script'i:**
```bash
# Boş catch blokları bul
grep -rn "catch.*{" src/ | grep -v "catch.*error\|catch.*e\|catch.*err"
```

---

### 11. Okuma Hızı Hesaplama Düzeltmesi

**Dosya:** `src/lib/services/tweet-generator.ts:241`
**Sorun:** 200 karakter/saniye çok hızlı, gerçekçi değil.

**Düzeltme:**
```typescript
// ÖNCE (Hatalı)
const estimatedReadTime = Math.ceil(totalCharacters / 200) // ~200 chars per second

// SONRA (Düzeltilmiş)
// Ortalama okuma hızı: ~250 kelime/dakika = ~1250 karakter/dakika = ~21 karakter/saniye
// Twitter için biraz daha hızlı varsayalım: ~30 karakter/saniye
const CHARS_PER_SECOND = 30
const estimatedReadTime = Math.ceil(totalCharacters / CHARS_PER_SECOND)

// Alternatif: Kelime bazlı hesaplama
const wordCount = content.split(/\s+/).length
const WORDS_PER_MINUTE = 250
const estimatedReadTimeMinutes = wordCount / WORDS_PER_MINUTE
const estimatedReadTimeSeconds = Math.ceil(estimatedReadTimeMinutes * 60)
```

---

## Uygulama Planı

### Hafta 1 (P0 - Kritik)

| Gün | Task | Dosya(lar) |
|-----|------|------------|
| 1 | Test-Service API uyumluluğu | `src/__tests__/services/*.test.ts` |
| 2 | JSON.parse güvenliği | `src/lib/utils/safe-json.ts`, tüm kullanan dosyalar |
| 3 | Account validation helper | `src/lib/utils/account-validator.ts`, `src/app/api/browser/post/route.ts` |
| 4-5 | Testleri çalıştır ve doğrula | Tüm test dosyaları |

### Hafta 2 (P1 - Yüksek)

| Gün | Task | Dosya(lar) |
|-----|------|------------|
| 1-2 | Browser selector fallback | `src/lib/browser/selectors.ts`, `src/lib/browser/x-automation.ts` |
| 3 | Thread parse düzeltmesi | `src/lib/services/tweet-generator.ts` |
| 4 | Reply reading time | `src/lib/browser/x-automation.ts` |
| 5 | Integration testleri | Test dosyaları |

### Hafta 3 (P2 - Orta)

| Gün | Task | Dosya(lar) |
|-----|------|------------|
| 1-2 | Parallel alternative generation | `src/lib/services/tweet-generator.ts` |
| 3 | Human score edge case | `src/lib/services/style-analyzer.ts` |
| 4 | Singleton pattern düzeltmesi | `src/lib/ai/provider-manager.ts` |
| 5 | Performance testleri | Benchmark |

### Hafta 4 (P3 - Düşük + Cleanup)

| Gün | Task | Dosya(lar) |
|-----|------|------------|
| 1 | Boş catch blokları düzeltme | Çoklu dosya |
| 2 | Okuma hızı düzeltmesi | `src/lib/services/tweet-generator.ts` |
| 3-4 | Code review ve cleanup | Tüm değişiklikler |
| 5 | Documentation güncelleme | `docs/` |

---

## Başarı Kriterleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Test Pass Rate | ~60% (API uyumsuzluğu) | 100% |
| Test Coverage | ~50% | 70%+ |
| Kritik Hata Sayısı | 3 | 0 |
| Yüksek Öncelikli Hata | 3 | 0 |

---

## Notlar

1. **Her düzeltme için branch oluşturun:** `fix/p0-test-api-mismatch`, `fix/p1-selector-fallback` vb.
2. **Her PR için test ekleyin:** Düzeltilen hatayı kapsayan test olmalı
3. **Backwards compatibility:** Mevcut API'leri bozmamaya dikkat edin
4. **Code review:** Her PR en az bir kişi tarafından review edilmeli

---

**Son Güncelleme:** 2026-01-26
