'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Button, Badge } from '@/components/common'
import { TweetQueueItem } from '@/components/tweets'

// Mock data
const mockTweets = [
  {
    id: '1',
    content: 'AI teknolojileri hakkında heyecan verici gelişmeler var! Thread geliyor...',
    status: 'pending',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 2),
    createdAt: new Date(),
    account: { username: 'example' },
  },
  {
    id: '2',
    content: 'Hafta sonu kodlama zamanı! Ne üzerinde çalışıyorsunuz?',
    status: 'pending',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 5),
    createdAt: new Date(),
    account: { username: 'example' },
  },
  {
    id: '3',
    content: 'TypeScript ipuçları serisi başlıyor! İlk bölümde any\'den kaçınmak hakkında konuşacağız.',
    status: 'pending',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    account: { username: 'testuser' },
  },
  {
    id: '4',
    content: 'Geçen hafta paylaşılan tweet.',
    status: 'posted',
    scheduledFor: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    account: { username: 'example' },
  },
]

type FilterStatus = 'all' | 'pending' | 'posted' | 'failed'

export default function QueuePage() {
  const [tweets, setTweets] = useState(mockTweets)
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filteredTweets = tweets.filter((tweet) => {
    if (filter === 'all') return true
    return tweet.status === filter
  })

  const pendingCount = tweets.filter((t) => t.status === 'pending').length
  const postedCount = tweets.filter((t) => t.status === 'posted').length
  const failedCount = tweets.filter((t) => t.status === 'failed').length

  const handleEdit = (id: string) => {
    console.log('Edit:', id)
  }

  const handleDelete = (id: string) => {
    setTweets(tweets.filter((t) => t.id !== id))
  }

  const handlePostNow = (id: string) => {
    setTweets(
      tweets.map((t) =>
        t.id === id ? { ...t, status: 'posted', scheduledFor: null } : t
      )
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Tweet Kuyruğu"
        subtitle="Zamanlanmış ve geçmiş tweetlerinizi yönetin"
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'all'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200 hover:border-blue-200'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{tweets.length}</p>
            <p className="text-sm text-gray-500">Toplam</p>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-white border-gray-200 hover:border-yellow-200'
            }`}
          >
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">Bekleyen</p>
          </button>
          <button
            onClick={() => setFilter('posted')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'posted'
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200 hover:border-green-200'
            }`}
          >
            <p className="text-2xl font-bold text-green-600">{postedCount}</p>
            <p className="text-sm text-gray-500">Paylaşıldı</p>
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'failed'
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200 hover:border-red-200'
            }`}
          >
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            <p className="text-sm text-gray-500">Başarısız</p>
          </button>
        </div>

        {/* Tweet List */}
        {filteredTweets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Kuyruk boş' : `${filter} tweet yok`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'Yeni tweet oluşturarak başlayın' : 'Bu filtreyle eşleşen tweet yok'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTweets.map((tweet) => (
              <TweetQueueItem
                key={tweet.id}
                tweet={tweet}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPostNow={handlePostNow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
