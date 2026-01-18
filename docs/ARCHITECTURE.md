# XBot - Mimari Dokümantasyonu

## Genel Bakış

XBot, X (Twitter) platformu için AI destekli tweet üretimi ve otomasyon aracıdır. Next.js 14, TypeScript ve modern web teknolojileri ile geliştirilmiştir.

## Teknoloji Yığını

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Prisma ORM + SQLite
- **AI Providers**: OpenAI, Claude (Anthropic), Google Gemini, Ollama
- **Browser Automation**: Playwright
- **State Management**: React Context / Zustand

---

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              XBOT SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        FRONTEND (Next.js 14)                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │  Dashboard   │  │   Tweet      │  │   Settings   │               │    │
│  │  │   Page       │  │   Manager    │  │    Panel     │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Style      │  │   Schedule   │  │   Analytics  │               │    │
│  │  │  Analyzer    │  │   Calendar   │  │    View      │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  │                                                                      │    │
│  │  UI Components: shadcn/ui + Tailwind CSS                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         API LAYER (Next.js API Routes)               │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │    │
│  │  │ /api/auth  │ │ /api/tweet │ │ /api/ai    │ │/api/browser│        │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘        │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                       │    │
│  │  │/api/style  │ │/api/schedule│ │/api/analytics│                    │    │
│  │  └────────────┘ └────────────┘ └────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         SERVICES LAYER                               │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    AI Provider Manager                       │    │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │    │
│  │  │  │ OpenAI  │ │ Claude  │ │ Gemini  │ │ Ollama  │            │    │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │   Style Analyzer     │  │   Tweet Generator    │                 │    │
│  │  │   Service            │  │   Service            │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │   Scheduler          │  │   Analytics          │                 │    │
│  │  │   Service            │  │   Service            │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    BROWSER AUTOMATION (Playwright)                   │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │   X (Twitter)        │  │   Session            │                 │    │
│  │  │   Automation         │  │   Manager            │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │   Tweet Poster       │  │   Profile Scraper    │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA LAYER (Prisma + SQLite)                      │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │  User   │ │  Tweet  │ │ Style   │ │Schedule │ │Analytics│        │    │
│  │  │ Account │ │  Draft  │ │ Profile │ │  Task   │ │  Log    │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Klasör Yapısı

```
Xbot/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── (dashboard)/          # Dashboard route group
│   │   │   ├── page.tsx          # Ana dashboard
│   │   │   ├── tweets/           # Tweet yönetimi
│   │   │   ├── style/            # Stil analizi
│   │   │   ├── schedule/         # Zamanlama
│   │   │   ├── analytics/        # Analitik
│   │   │   └── settings/         # Ayarlar
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/             # Kimlik doğrulama
│   │   │   ├── tweets/           # Tweet CRUD
│   │   │   ├── ai/               # AI işlemleri
│   │   │   │   ├── generate/     # Tweet üretimi
│   │   │   │   └── analyze/      # Stil analizi
│   │   │   ├── browser/          # Playwright işlemleri
│   │   │   ├── schedule/         # Zamanlama
│   │   │   └── analytics/        # Analitik
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/               # React Bileşenleri
│   │   ├── ui/                   # shadcn/ui bileşenleri
│   │   ├── dashboard/            # Dashboard bileşenleri
│   │   ├── tweets/               # Tweet bileşenleri
│   │   ├── style/                # Stil analiz bileşenleri
│   │   └── common/               # Ortak bileşenler
│   │
│   ├── lib/                      # Utility & Core Logic
│   │   ├── ai/                   # AI Provider entegrasyonu
│   │   │   ├── provider-manager.ts
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   └── ollama.ts
│   │   ├── browser/              # Playwright otomasyon
│   │   │   ├── session.ts
│   │   │   ├── x-automation.ts
│   │   │   └── actions.ts
│   │   ├── services/             # Business Logic
│   │   │   ├── tweet-generator.ts
│   │   │   ├── style-analyzer.ts
│   │   │   ├── scheduler.ts
│   │   │   └── analytics.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   ├── use-ai.ts
│   │   ├── use-tweets.ts
│   │   └── use-browser.ts
│   │
│   └── types/                    # TypeScript Tipleri
│       ├── ai.ts
│       ├── tweet.ts
│       ├── browser.ts
│       └── index.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   └── ARCHITECTURE.md
│
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## Veritabanı Şeması

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐       ┌─────────────────────┐                      │
│  │      Account        │       │    StyleProfile     │                      │
│  ├─────────────────────┤       ├─────────────────────┤                      │
│  │ id: String (PK)     │──────▶│ id: String (PK)     │                      │
│  │ username: String    │       │ accountId: String   │                      │
│  │ displayName: String │       │ toneAnalysis: Json  │                      │
│  │ sessionData: Json   │       │ vocabularyStyle: Json│                     │
│  │ isActive: Boolean   │       │ topicPreferences: Json│                    │
│  │ createdAt: DateTime │       │ postingPatterns: Json │                    │
│  │ updatedAt: DateTime │       │ analyzedTweets: Int  │                     │
│  └─────────────────────┘       │ lastAnalyzed: DateTime│                    │
│           │                    └─────────────────────┘                      │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────┐       ┌─────────────────────┐                      │
│  │       Tweet         │       │   ScheduledTask     │                      │
│  ├─────────────────────┤       ├─────────────────────┤                      │
│  │ id: String (PK)     │       │ id: String (PK)     │                      │
│  │ accountId: String   │       │ tweetId: String     │◀──────┐              │
│  │ content: String     │───────│ scheduledFor: DateTime│      │              │
│  │ generatedBy: String │       │ status: Enum        │      │              │
│  │ status: Enum        │       │ retryCount: Int     │      │              │
│  │ styleScore: Float   │       │ executedAt: DateTime│      │              │
│  │ metadata: Json      │       │ error: String?      │      │              │
│  │ createdAt: DateTime │       └─────────────────────┘      │              │
│  │ postedAt: DateTime? │                                     │              │
│  └─────────────────────┘                                     │              │
│           │                                                   │              │
│           │                    ┌─────────────────────┐       │              │
│           └───────────────────▶│   AnalyticsLog      │◀──────┘              │
│                                ├─────────────────────┤                      │
│                                │ id: String (PK)     │                      │
│  ┌─────────────────────┐       │ tweetId: String?    │                      │
│  │     AIProvider      │       │ eventType: String   │                      │
│  ├─────────────────────┤       │ data: Json          │                      │
│  │ id: String (PK)     │       │ createdAt: DateTime │                      │
│  │ name: String        │       └─────────────────────┘                      │
│  │ type: Enum          │                                                     │
│  │ apiKey: String?     │       ┌─────────────────────┐                      │
│  │ baseUrl: String?    │       │    Settings         │                      │
│  │ modelId: String     │       ├─────────────────────┤                      │
│  │ isActive: Boolean   │       │ id: String (PK)     │                      │
│  │ priority: Int       │       │ key: String (unique)│                      │
│  │ config: Json        │       │ value: Json         │                      │
│  └─────────────────────┘       │ updatedAt: DateTime │                      │
│                                └─────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Provider Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI PROVIDER FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐                                                         │
│    │ Tweet Üretme │                                                         │
│    │   İsteği     │                                                         │
│    └──────┬───────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│    ┌──────────────────────────────────────────────┐                         │
│    │           AI Provider Manager                 │                         │
│    │  ┌────────────────────────────────────────┐  │                         │
│    │  │ 1. Stil profili al                     │  │                         │
│    │  │ 2. Aktif provider seç (priority)       │  │                         │
│    │  │ 3. Prompt oluştur (stil + konu)        │  │                         │
│    │  │ 4. Fallback stratejisi uygula          │  │                         │
│    │  └────────────────────────────────────────┘  │                         │
│    └──────────────────┬───────────────────────────┘                         │
│                       │                                                      │
│         ┌─────────────┼─────────────┬─────────────┐                         │
│         │             │             │             │                          │
│         ▼             ▼             ▼             ▼                          │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│    │ OpenAI  │  │ Claude  │  │ Gemini  │  │ Ollama  │                       │
│    │ GPT-4   │  │ Sonnet  │  │  Pro    │  │ Local   │                       │
│    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                       │
│         │             │             │             │                          │
│         └─────────────┴─────────────┴─────────────┘                         │
│                       │                                                      │
│                       ▼                                                      │
│    ┌──────────────────────────────────────────────┐                         │
│    │           Response Handler                    │                         │
│    │  ┌────────────────────────────────────────┐  │                         │
│    │  │ 1. Response validation                 │  │                         │
│    │  │ 2. Stil uyumluluk skoru                │  │                         │
│    │  │ 3. Karakter limiti kontrolü            │  │                         │
│    │  │ 4. Tweet formatı düzenleme             │  │                         │
│    │  └────────────────────────────────────────┘  │                         │
│    └──────────────────┬───────────────────────────┘                         │
│                       │                                                      │
│                       ▼                                                      │
│    ┌──────────────────────────────────────────────┐                         │
│    │           Generated Tweet                     │                         │
│    │  - content: String                           │                         │
│    │  - styleScore: Float                         │                         │
│    │  - provider: String                          │                         │
│    │  - metadata: {...}                           │                         │
│    └──────────────────────────────────────────────┘                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Browser Automation Akışı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BROWSER AUTOMATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                     Session Manager                                 │   │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│    │  │ Cookie Store │  │ Context Pool │  │ Fingerprint  │              │   │
│    │  │  (encrypted) │  │  Management  │  │  Rotation    │              │   │
│    │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│    └────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│                                 ▼                                            │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                      X Automation Core                              │   │
│    └────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                    │
│         ▼                       ▼                       ▼                    │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐             │
│  │ Profile      │       │    Tweet     │       │   Timeline   │             │
│  │ Scraper      │       │   Poster     │       │   Reader     │             │
│  ├──────────────┤       ├──────────────┤       ├──────────────┤             │
│  │ • Bio        │       │ • Compose    │       │ • Fetch      │             │
│  │ • Tweets     │       │ • Media      │       │ • Parse      │             │
│  │ • Style data │       │ • Thread     │       │ • Extract    │             │
│  │ • Metrics    │       │ • Reply      │       │   engagement │             │
│  └──────────────┘       └──────────────┘       └──────────────┘             │
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                      Safety & Rate Limiting                         │   │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│    │  │ Human-like   │  │ Rate Limiter │  │ Error        │              │   │
│    │  │ Delays       │  │ (per action) │  │ Recovery     │              │   │
│    │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Geliştirme Aşamaları

### Phase 1: Temel Altyapı
- [ ] Next.js 14 proje kurulumu
- [ ] Tailwind CSS + shadcn/ui entegrasyonu
- [ ] Prisma + SQLite veritabanı kurulumu
- [ ] Temel klasör yapısı oluşturma
- [ ] TypeScript tip tanımlamaları

### Phase 2: AI Entegrasyonu
- [ ] AI Provider Manager altyapısı
- [ ] OpenAI entegrasyonu
- [ ] Claude (Anthropic) entegrasyonu
- [ ] Google Gemini entegrasyonu
- [ ] Ollama (local) entegrasyonu
- [ ] Fallback ve priority sistemi

### Phase 3: Stil Analizi
- [ ] Tweet scraping altyapısı
- [ ] Stil analiz algoritması
- [ ] Ton & dil analizi
- [ ] Konu tercihleri çıkarımı
- [ ] Stil profil depolama

### Phase 4: Tweet Üretimi
- [ ] Tweet generator servisi
- [ ] Stil-bazlı prompt mühendisliği
- [ ] Karakter limiti yönetimi
- [ ] Thread oluşturma desteği
- [ ] Media suggestion sistemi

### Phase 5: Browser Otomasyon
- [ ] Playwright kurulumu
- [ ] Session yönetimi
- [ ] X login otomasyonu
- [ ] Tweet posting otomasyonu
- [ ] Rate limiting & güvenlik

### Phase 6: Dashboard & UI
- [ ] Ana dashboard sayfası
- [ ] Tweet yönetim arayüzü
- [ ] Stil analiz paneli
- [ ] Zamanlama takvimi
- [ ] Analitik görünümleri
- [ ] Ayarlar paneli

### Phase 7: Zamanlama & Analitik
- [ ] Cron job altyapısı
- [ ] Zamanlama servisi
- [ ] Analitik veri toplama
- [ ] Raporlama sistemi

### Phase 8: Test & Deployment
- [ ] Unit testler
- [ ] Integration testler
- [ ] E2E testler
- [ ] Production build optimizasyonu
- [ ] Deployment hazırlığı

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Encryption (for session data)
ENCRYPTION_KEY=
```

---

## Lisans

MIT License - Hüseyin için özel proje
