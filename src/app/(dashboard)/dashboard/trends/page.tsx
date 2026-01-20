'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { TrendingTopics } from '@/components/analytics'
import { Card, Button, Badge, Loading } from '@/components/common'

interface Trend {
  name: string
  category: string
  tweetCount: number
  url: string
}

interface Suggestion {
  topic: string
  suggestion: string
  engagement: string
}

export default function TrendsPage() {
  const router = useRouter()
  const [trends, setTrends] = useState<Trend[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trends')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.trends) {
          setTrends(data.data.trends.map((t: { name: string; category: string; tweetCount: number }) => ({
            name: t.name,
            category: t.category || 'Genel',
            tweetCount: t.tweetCount || 0,
            url: `https://x.com/search?q=${encodeURIComponent(t.name)}`,
          })))
          setLastUpdated(new Date())
        }
      }
    } catch (error) {
      console.error('Trends fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (selectedTopics.length === 0 && trends.length === 0) return

    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/trends/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: {
            topics: selectedTopics.length > 0 ? selectedTopics : [],
            keywords: [],
            accounts: [],
            excludeTopics: [],
            preferredCategories: selectedTopics.map(t => t.toLowerCase()),
          },
          count: 3,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.suggestions) {
          setSuggestions(data.data.suggestions.map((s: { trend: string; suggestion: string; expectedEngagement: string }) => ({
            topic: s.trend,
            suggestion: s.suggestion,
            engagement: s.expectedEngagement || 'Orta',
          })))
        }
      }
    } catch (error) {
      console.error('Suggestions fetch error:', error)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [])

  useEffect(() => {
    if (trends.length > 0) {
      fetchSuggestions()
    }
  }, [selectedTopics, trends])

  const handleRefresh = async () => {
    await fetchTrends()
    await fetchSuggestions()
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

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return '-'
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} sn önce`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} dk önce`
    const hours = Math.floor(minutes / 60)
    return `${hours} saat önce`
  }

  const getMostPopularCategory = () => {
    if (trends.length === 0) return 'Yok'
    const categoryCounts: Record<string, number> = {}
    trends.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
    })
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || 'Genel'
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Trendler"
          subtitle="Güncel trendleri takip edin ve içerik üretin"
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
        title="Trendler"
        subtitle="Güncel trendleri takip edin ve içerik üretin"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trends */}
          <div className="lg:col-span-2">
            {trends.length > 0 ? (
              <TrendingTopics
                trends={trends}
                onRefresh={handleRefresh}
                loading={loading}
                onUseTrend={handleUseTrend}
              />
            ) : (
              <Card title="Trendler">
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Trend bulunamadı</p>
                  <p className="text-sm mb-4">Trend verileri henüz yüklenemedi veya mevcut değil.</p>
                  <Button variant="primary" onClick={handleRefresh}>
                    Yenile
                  </Button>
                </div>
              </Card>
            )}
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
                  <Badge variant="info">{getMostPopularCategory()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Son Güncelleme</span>
                  <span className="text-sm text-gray-500">{formatTimeAgo(lastUpdated)}</span>
                </div>
              </div>
            </Card>

            {/* Content Suggestions */}
            <Card title="İçerik Önerileri" subtitle="Trendlere göre tweet fikirleri">
              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loading size="sm" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
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
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">İlgi alanlarınızı seçin ve öneriler alın</p>
                </div>
              )}
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
              {selectedTopics.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {selectedTopics.length} konu seçildi
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
