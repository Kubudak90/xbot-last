'use client'

import { Card, Badge, Button } from '@/components/common'

interface TrendingTopic {
  name: string
  category?: string
  tweetCount?: number
  url: string
}

interface TrendingTopicsProps {
  trends: TrendingTopic[]
  onRefresh: () => void
  loading?: boolean
  onUseTrend: (topic: string) => void
}

export default function TrendingTopics({ trends, onRefresh, loading, onUseTrend }: TrendingTopicsProps) {
  const formatCount = (count?: number) => {
    if (!count) return ''
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <Card
      title="Gündem"
      subtitle="Şu an popüler konular"
      action={
        <Button variant="ghost" size="sm" onClick={onRefresh} loading={loading}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      }
    >
      <div className="space-y-3">
        {trends.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-gray-500 text-sm">Trend yüklenemedi</p>
            <button
              onClick={onRefresh}
              className="text-blue-600 text-sm hover:underline mt-1"
            >
              Yenile
            </button>
          </div>
        ) : (
          trends.map((trend, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300 w-6">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{trend.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {trend.category && (
                      <Badge size="sm" variant="default">{trend.category}</Badge>
                    )}
                    {trend.tweetCount && (
                      <span className="text-xs text-gray-400">
                        {formatCount(trend.tweetCount)} tweet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUseTrend(trend.name)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Kullan
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
