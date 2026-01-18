# XBot - X (Twitter) Automation Platform

XBot is a comprehensive X (Twitter) automation tool powered by AI for intelligent tweet generation, style analysis, and human-like behavior simulation.

## Features

- **AI-Powered Tweet Generation**: Multiple AI provider support (OpenAI, Claude, Gemini, Ollama)
- **Style Analysis**: Analyze tweets, retweets, and likes to understand user patterns
- **Human-Like Behavior**: Natural delays, rate limiting, and activity patterns
- **Browser Automation**: Playwright-based automation with stealth mode
- **Scheduling System**: Schedule tweets and threads with optimal timing
- **Analytics Dashboard**: Track performance, engagement, and AI usage
- **Multi-Account Support**: Manage multiple X accounts from one dashboard

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma ORM with SQLite
- **Browser Automation**: Playwright with stealth scripts
- **AI Providers**: OpenAI, Anthropic Claude, Google Gemini, Ollama
- **UI**: React with Tailwind CSS
- **Testing**: Jest + React Testing Library
- **Deployment**: Docker with multi-stage builds

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- (Optional) Docker for containerized deployment

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/xbot.git
cd xbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` with required API keys and settings.

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

6. Install Playwright browsers:
```bash
npx playwright install chromium
```

7. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for session encryption | Yes |
| `OPENAI_API_KEY` | OpenAI API key | No* |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | No* |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | No* |
| `OLLAMA_BASE_URL` | Ollama server URL | No* |

*At least one AI provider is required for tweet generation.

### AI Provider Priority

Configure provider priority in the dashboard settings or via environment:
```
AI_PROVIDER_PRIORITY=claude,openai,gemini,ollama
```

## Project Structure

```
xbot/
├── src/
│   ├── app/              # Next.js pages and API routes
│   │   ├── api/          # API endpoints
│   │   └── dashboard/    # Dashboard pages
│   ├── components/       # React components
│   │   ├── common/       # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   ├── accounts/     # Account management
│   │   ├── tweets/       # Tweet composition
│   │   └── analytics/    # Analytics widgets
│   └── lib/              # Core libraries
│       ├── ai/           # AI provider integrations
│       ├── browser/      # Browser automation
│       ├── scheduler/    # Tweet scheduling
│       ├── analytics/    # Data collection
│       └── style/        # Style analysis
├── prisma/               # Database schema
├── scripts/              # Deployment scripts
└── docker-compose.yml    # Docker configuration
```

## API Endpoints

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Add new account
- `DELETE /api/accounts?id=xxx` - Remove account

### Tweets
- `POST /api/tweets/generate` - Generate AI tweets
- `POST /api/tweets/post` - Post a tweet
- `GET /api/tweets/history` - Get tweet history

### Browser
- `POST /api/browser/login` - Login to X account
- `POST /api/browser/post` - Post tweet via browser
- `POST /api/browser/scrape` - Scrape tweets/data
- `POST /api/browser/interact` - Like, follow, etc.

### Scheduler
- `POST /api/scheduler/schedule` - Schedule tweets
- `GET /api/scheduler/schedule` - Get scheduled tweets
- `POST /api/scheduler/control` - Start/stop scheduler

### Analytics
- `GET /api/analytics/stats` - Get account statistics
- `GET /api/analytics/top-tweets` - Get top performing tweets
- `GET /api/analytics/providers` - Get AI provider usage

### Health
- `GET /api/health` - Health check
- `GET /api/health/metrics` - Performance metrics

## Deployment

### Development
```bash
./scripts/deploy.sh development
```

### Production
```bash
./scripts/deploy.sh production
```

### Docker
```bash
./scripts/deploy.sh docker
```

Or manually:
```bash
docker-compose up -d
```

### Docker Registry Push
```bash
export DOCKER_REGISTRY=your-registry.com
./scripts/deploy.sh docker-push
```

## Testing

Run all tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Human-Like Behavior

XBot implements various techniques to simulate human behavior:

- **Typing Delays**: Random delays between keystrokes (50-150ms)
- **Reading Time**: Realistic delays based on content length
- **Rate Limiting**: Configurable limits for different actions
- **Activity Patterns**: Natural usage patterns (pauses, breaks)
- **Browser Fingerprinting**: Stealth mode to avoid detection

## Security

- Session data is encrypted using AES-256-CBC
- API keys are stored in environment variables
- Browser sessions are isolated per account
- No credentials are stored in the database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and personal use only. Use responsibly and in accordance with X's Terms of Service. The authors are not responsible for any misuse of this software.
