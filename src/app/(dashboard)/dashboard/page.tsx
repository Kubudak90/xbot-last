'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { StatsCard, RecentActivity, QuickActions, UpcomingTweets } from '@/components/dashboard'

interface Stats {
  totalTweets: number
  pendingTweets: number
  styleMatch: number
  activeAccounts: number
  tweetChange?: number
  styleChange?: number
}

interface Activity {
  id: string
  type: 'tweet' | 'like' | 'follow' | 'analysis'
  message: string
  account: string
  timestamp: Date
}

interface UpcomingTweet {
  id: string
  content: string
  scheduledFor: Date
  account: { username: string }
}

interface AIProvider {
  name: string
  type: string
  isActive: boolean
  isHealthy: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalTweets: 0,
    pendingTweets: 0,
    styleMatch: 0,
    activeAccounts: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [upcomingTweets, setUpcomingTweets] = useState<UpcomingTweet[]>([])
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/analytics/stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.success) {
            setStats({
              totalTweets: statsData.data.totalTweets || 0,
              pendingTweets: statsData.data.pendingTweets || 0,
              styleMatch: statsData.data.averageStyleScore || 0,
              activeAccounts: statsData.data.activeAccounts || 0,
              tweetChange: statsData.data.tweetChange,
              styleChange: statsData.data.styleChange,
            })
          }
        }

        // Fetch upcoming tweets (queue)
        const queueRes = await fetch('/api/tweets/queue')
        if (queueRes.ok) {
          const queueData = await queueRes.json()
          if (queueData.success && queueData.data) {
            const upcoming = queueData.data.slice(0, 5).map((tweet: any) => ({
              id: tweet.id,
              content: tweet.content,
              scheduledFor: new Date(tweet.scheduledFor),
              account: { username: tweet.account?.username || 'unknown' },
            }))
            setUpcomingTweets(upcoming)
          }
        }

        // Fetch AI providers
        const providersRes = await fetch('/api/ai/providers')
        if (providersRes.ok) {
          const providersData = await providersRes.json()
          if (providersData.success && providersData.data?.providers) {
            setProviders(providersData.data.providers)
          }
        }

        // Fetch recent activity from analytics
        const activityRes = await fetch('/api/analytics/stats?includeActivity=true')
        if (activityRes.ok) {
          const activityData = await activityRes.json()
          if (activityData.success && activityData.data?.recentActivity) {
            setActivities(activityData.data.recentActivity.map((a: any) => ({
              ...a,
              timestamp: new Date(a.timestamp),
            })))
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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
            value={loading ? '-' : stats.totalTweets}
            change={stats.tweetChange}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
          />
          <StatsCard
            title="Bekleyen Tweet"
            value={loading ? '-' : stats.pendingTweets}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Stil Eşleşme"
            value={loading ? '-' : `${Math.round(stats.styleMatch * 100)}%`}
            change={stats.styleChange}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            }
          />
          <StatsCard
            title="Aktif Hesap"
            value={loading ? '-' : stats.activeAccounts}
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
            <RecentActivity activities={activities} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <UpcomingTweets tweets={upcomingTweets} />

            {/* AI Provider Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI Sağlayıcıları</h3>
              {loading ? (
                <p className="text-sm text-gray-500">Yükleniyor...</p>
              ) : providers.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz AI sağlayıcısı yapılandırılmamış</p>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <ProviderItem
                      key={provider.type}
                      name={provider.name}
                      status={provider.isActive ? 'active' : 'inactive'}
                      isHealthy={provider.isHealthy}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderItem({ name, status, isHealthy }: { name: string; status: 'active' | 'inactive'; isHealthy: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === 'active' ? (isHealthy ? 'bg-green-500' : 'bg-yellow-500') : 'bg-gray-300'}`} />
      <span className="text-sm text-gray-700 flex-1">{name}</span>
      <span className={`text-xs px-2 py-0.5 rounded ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {status === 'active' ? (isHealthy ? 'Aktif' : 'Bağlanıyor') : 'Pasif'}
      </span>
    </div>
  )
}
