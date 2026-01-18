'use client'

import { Header } from '@/components/layout'
import { Card, Badge, Select } from '@/components/common'
import { StatsCard } from '@/components/dashboard'

export default function AnalyticsPage() {
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
              defaultValue="30"
            />
          </div>
        </div>

        {/* Overview Stats */}
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
            title="Toplam Beğeni"
            value="2.4K"
            change={8}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            }
          />
          <StatsCard
            title="Toplam Retweet"
            value={856}
            change={-3}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
          <StatsCard
            title="Yeni Takipçi"
            value={234}
            change={15}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
                <p className="text-sm">Grafik bileşeni entegre edilecek</p>
              </div>
            </div>
          </Card>

          {/* Best Performing Tweets */}
          <Card title="En İyi Performans" subtitle="En çok etkileşim alan tweetler">
            <div className="space-y-4">
              {[
                { content: 'AI ile otomasyon konusunda harika bir proje...', likes: 156, retweets: 42 },
                { content: 'TypeScript ipuçları thread\'i çok beğenildi...', likes: 134, retweets: 38 },
                { content: 'Remote çalışma deneyimlerimi paylaştım...', likes: 98, retweets: 25 },
              ].map((tweet, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
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
              ))}
            </div>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tweet Types */}
          <Card title="Tweet Türleri">
            <div className="space-y-3">
              {[
                { type: 'Bilgilendirici', count: 45, percentage: 35 },
                { type: 'Etkileşimli', count: 38, percentage: 30 },
                { type: 'Thread', count: 25, percentage: 20 },
                { type: 'Soru', count: 20, percentage: 15 },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24">{item.type}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Best Times */}
          <Card title="En İyi Zamanlar">
            <div className="space-y-3">
              {[
                { time: '09:00 - 11:00', engagement: 'Yüksek' },
                { time: '14:00 - 16:00', engagement: 'Orta' },
                { time: '20:00 - 22:00', engagement: 'Yüksek' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{item.time}</span>
                  <Badge variant={item.engagement === 'Yüksek' ? 'success' : 'default'}>
                    {item.engagement}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Usage */}
          <Card title="AI Kullanımı">
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">87%</p>
                <p className="text-sm text-gray-500">Stil Eşleşme Oranı</p>
              </div>
              <div className="space-y-2">
                {[
                  { provider: 'OpenAI', usage: 65 },
                  { provider: 'Claude', usage: 30 },
                  { provider: 'Ollama', usage: 5 },
                ].map((item) => (
                  <div key={item.provider} className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 w-16">{item.provider}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${item.usage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{item.usage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
