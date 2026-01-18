'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { TrendingTopics } from '@/components/analytics'
import { Card, Button, Badge } from '@/components/common'

// Mock data
const mockTrends = [
  { name: '#YapayZeka', category: 'Teknoloji', tweetCount: 125000, url: 'https://x.com/search?q=%23YapayZeka' },
  { name: '#TypeScript', category: 'Programlama', tweetCount: 45000, url: 'https://x.com/search?q=%23TypeScript' },
  { name: '#WebDev', category: 'Teknoloji', tweetCount: 38000, url: 'https://x.com/search?q=%23WebDev' },
  { name: 'React', category: 'Programlama', tweetCount: 92000, url: 'https://x.com/search?q=React' },
  { name: '#Startup', category: 'İş', tweetCount: 67000, url: 'https://x.com/search?q=%23Startup' },
  { name: '#MachineLearning', category: 'Teknoloji', tweetCount: 83000, url: 'https://x.com/search?q=%23MachineLearning' },
  { name: 'OpenAI', category: 'Teknoloji', tweetCount: 156000, url: 'https://x.com/search?q=OpenAI' },
  { name: '#RemoteWork', category: 'İş', tweetCount: 29000, url: 'https://x.com/search?q=%23RemoteWork' },
]

const mockSuggestions = [
  {
    topic: '#YapayZeka',
    suggestion: 'AI teknolojilerinin geleceği hakkında düşüncelerinizi paylaşın',
    engagement: 'Yüksek',
  },
  {
    topic: '#TypeScript',
    suggestion: 'TypeScript ipuçları ve best practices hakkında bir thread yazabilirsiniz',
    engagement: 'Orta',
  },
  {
    topic: 'React',
    suggestion: 'React 19 ile gelen yenilikler hakkında bir içerik oluşturun',
    engagement: 'Yüksek',
  },
]

export default function TrendsPage() {
  const router = useRouter()
  const [trends, setTrends] = useState(mockTrends)
  const [loading, setLoading] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const handleRefresh = async () => {
    setLoading(true)
    // TODO: Implement actual trend fetching via API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
  }

  const handleUseTrend = (topic: string) => {
    router.push(`/dashboard/compose?topic=${encodeURIComponent(topic)}`)
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Trendler"
        subtitle="Güncel trendleri takip edin ve içerik üretin"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trends */}
          <div className="lg:col-span-2">
            <TrendingTopics
              trends={trends}
              onRefresh={handleRefresh}
              loading={loading}
              onUseTrend={handleUseTrend}
            />
          </div>

          {/* Suggestions */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card title="Trend İstatistikleri">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Toplam Trend</span>
                  <span className="font-semibold">{trends.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">En Popüler Kategori</span>
                  <Badge variant="info">Teknoloji</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Son Güncelleme</span>
                  <span className="text-sm text-gray-500">5 dk önce</span>
                </div>
              </div>
            </Card>

            {/* Content Suggestions */}
            <Card title="İçerik Önerileri" subtitle="Trendlere göre tweet fikirleri">
              <div className="space-y-4">
                {mockSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleUseTrend(suggestion.topic)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info" size="sm">{suggestion.topic}</Badge>
                      <Badge
                        variant={suggestion.engagement === 'Yüksek' ? 'success' : 'default'}
                        size="sm"
                      >
                        {suggestion.engagement} Etkileşim
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{suggestion.suggestion}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Interest Topics */}
            <Card title="İlgi Alanlarınız" subtitle="Takip etmek istediğiniz konuları seçin">
              <div className="flex flex-wrap gap-2 mb-4">
                {['Teknoloji', 'Programlama', 'AI', 'Startup', 'Web Dev', 'Mobile', 'Cloud', 'DevOps'].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedTopics.includes(topic)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="w-full">
                Tercihleri Kaydet
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
