'use client'

import { Header } from '@/components/layout'
import { StatsCard, RecentActivity, QuickActions, UpcomingTweets } from '@/components/dashboard'

// Mock data - will be replaced with real data from API
const mockActivities = [
  { id: '1', type: 'tweet' as const, message: 'Yeni tweet paylaşıldı', account: 'example', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '2', type: 'analysis' as const, message: 'Stil analizi tamamlandı', account: 'example', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: '3', type: 'like' as const, message: '3 tweet beğenildi', account: 'example', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '4', type: 'follow' as const, message: 'Yeni takipçi: @user123', account: 'example', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
]

const mockUpcomingTweets = [
  { id: '1', content: 'AI teknolojisi hakkında heyecan verici gelişmeler var! Thread geliyor...', scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 2), account: { username: 'example' } },
  { id: '2', content: 'Hafta sonu kodlama zamanı! Ne üzerinde çalışıyorsunuz?', scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 5), account: { username: 'example' } },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="XBot otomasyon paneline hoş geldiniz"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Toplam Tweet"
            value={128}
            change={12}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
          />
          <StatsCard
            title="Bekleyen Tweet"
            value={5}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Stil Eşleşme"
            value="87%"
            change={5}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            }
          />
          <StatsCard
            title="Aktif Hesap"
            value={2}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <QuickActions />
            <RecentActivity activities={mockActivities} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <UpcomingTweets tweets={mockUpcomingTweets} />

            {/* AI Provider Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI Sağlayıcıları</h3>
              <div className="space-y-3">
                <ProviderItem name="OpenAI GPT-4" status="active" usage={65} />
                <ProviderItem name="Claude Sonnet" status="active" usage={30} />
                <ProviderItem name="Gemini Pro" status="inactive" usage={0} />
                <ProviderItem name="Ollama Local" status="active" usage={5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderItem({ name, status, usage }: { name: string; status: 'active' | 'inactive'; usage: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className="text-sm text-gray-700 flex-1">{name}</span>
      <div className="w-20 bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full"
          style={{ width: `${usage}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8">{usage}%</span>
    </div>
  )
}
