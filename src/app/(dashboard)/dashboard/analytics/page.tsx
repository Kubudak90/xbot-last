'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, Badge, Select, Loading } from '@/components/common'
import { StatsCard } from '@/components/dashboard'

interface AnalyticsStats {
  totalTweets: number
  totalLikes: number
  totalRetweets: number
  totalReplies: number
  tweetChange: number
  likeChange: number
  retweetChange: number
  replyChange: number
}

interface TopTweet {
  id: string
  content: string
  likes: number
  retweets: number
  replies: number
  postedAt: string
}

interface ProviderStats {
  provider: string
  usage: number
  generations: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [stats, setStats] = useState<AnalyticsStats>({
    totalTweets: 0,
    totalLikes: 0,
    totalRetweets: 0,
    totalReplies: 0,
    tweetChange: 0,
    likeChange: 0,
    retweetChange: 0,
    replyChange: 0,
  })
  const [topTweets, setTopTweets] = useState<TopTweet[]>([])
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([])

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        // Fetch stats
        const statsRes = await fetch(`/api/analytics/stats?period=${period}`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.success && statsData.data) {
            setStats({
              totalTweets: statsData.data.totalTweets || 0,
              totalLikes: statsData.data.totalLikes || 0,
              totalRetweets: statsData.data.totalRetweets || 0,
              totalReplies: statsData.data.totalReplies || 0,
              tweetChange: statsData.data.tweetChange || 0,
              likeChange: statsData.data.likeChange || 0,
              retweetChange: statsData.data.retweetChange || 0,
              replyChange: statsData.data.replyChange || 0,
            })
          }
        }

        // Fetch top tweets
        const topTweetsRes = await fetch(`/api/analytics/top-tweets?period=${period}&limit=5`)
        if (topTweetsRes.ok) {
          const topTweetsData = await topTweetsRes.json()
          if (topTweetsData.success && topTweetsData.data) {
            setTopTweets(topTweetsData.data)
          }
        }

        // Fetch provider stats
        const providersRes = await fetch('/api/analytics/providers')
        if (providersRes.ok) {
          const providersData = await providersRes.json()
          if (providersData.success && providersData.data) {
            setProviderStats(providersData.data)
          }
        }
      } catch (error) {
        console.error('Analytics fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Analitik"
          subtitle="Performans ve etkileşim istatistikleri"
        />
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Analitik"
        subtitle="Performans ve etkileşim istatistikleri"
      />

      <div className="p-6 space-y-6">
        {/* Time Period Selector */}
        <div className="flex justify-end">
          <div className="w-48">
            <Select
              options={[
                { value: '7', label: 'Son 7 gün' },
                { value: '30', label: 'Son 30 gün' },
                { value: '90', label: 'Son 90 gün' },
              ]}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Toplam Tweet"
            value={stats.totalTweets}
            change={stats.tweetChange}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
          />
          <StatsCard
            title="Toplam Beğeni"
            value={formatNumber(stats.totalLikes)}
            change={stats.likeChange}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            }
          />
          <StatsCard
            title="Toplam Retweet"
            value={formatNumber(stats.totalRetweets)}
            change={stats.retweetChange}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
          <StatsCard
            title="Toplam Yanıt"
            value={formatNumber(stats.totalReplies)}
            change={stats.replyChange}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            }
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Over Time */}
          <Card title="Etkileşim Grafiği" subtitle="Günlük etkileşim oranları">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">Yeterli veri toplandığında grafik görüntülenecek</p>
              </div>
            </div>
          </Card>

          {/* Best Performing Tweets */}
          <Card title="En İyi Performans" subtitle="En çok etkileşim alan tweetler">
            <div className="space-y-4">
              {topTweets.length > 0 ? (
                topTweets.map((tweet) => (
                  <div key={tweet.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-gray-900 truncate">{tweet.content}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-red-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {tweet.likes}
                      </span>
                      <span className="flex items-center gap-1 text-green-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {tweet.retweets}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Henüz paylaşılan tweet yok</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tweet Summary */}
          <Card title="Tweet Özeti">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Toplam Paylaşım</span>
                <Badge variant="info">{stats.totalTweets}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Toplam Etkileşim</span>
                <Badge variant="success">{formatNumber(stats.totalLikes + stats.totalRetweets + stats.totalReplies)}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Ort. Etkileşim/Tweet</span>
                <Badge variant="default">
                  {stats.totalTweets > 0
                    ? Math.round((stats.totalLikes + stats.totalRetweets + stats.totalReplies) / stats.totalTweets)
                    : 0}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Best Times - Static placeholder for now */}
          <Card title="En İyi Zamanlar">
            <div className="space-y-3">
              <div className="text-center py-4 text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Daha fazla tweet paylaşıldıkça</p>
                <p className="text-sm">en iyi zamanlar belirlenecek</p>
              </div>
            </div>
          </Card>

          {/* AI Usage */}
          <Card title="AI Kullanımı">
            <div className="space-y-4">
              {providerStats.length > 0 ? (
                <div className="space-y-2">
                  {providerStats.map((item) => (
                    <div key={item.provider} className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 w-20 capitalize">{item.provider}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${item.usage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16">{item.generations} istek</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm">AI henüz kullanılmadı</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
