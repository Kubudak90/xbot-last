'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout'
import { TweetQueueItem } from '@/components/tweets'

interface QueueTweet {
  id: string
  content: string
  status: string
  scheduledFor: Date | null
  createdAt: Date
  account: { username: string }
}

type FilterStatus = 'all' | 'SCHEDULED' | 'POSTED' | 'FAILED' | 'DRAFT'

export default function QueuePage() {
  const [tweets, setTweets] = useState<QueueTweet[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchTweets()
  }, [])

  async function fetchTweets() {
    try {
      const res = await fetch('/api/tweets/queue')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setTweets(data.data.map((t: any) => ({
            ...t,
            scheduledFor: t.scheduledFor ? new Date(t.scheduledFor) : null,
            createdAt: new Date(t.createdAt),
          })))
        }
      }
    } catch (error) {
      console.error('Failed to fetch tweets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTweets = tweets.filter((tweet) => {
    if (filter === 'all') return true
    return tweet.status === filter
  })

  const pendingCount = tweets.filter((t) => t.status === 'SCHEDULED' || t.status === 'DRAFT').length
  const postedCount = tweets.filter((t) => t.status === 'POSTED').length
  const failedCount = tweets.filter((t) => t.status === 'FAILED').length

  const handleEdit = (id: string) => {
    // Navigate to compose page with tweet ID for editing
    window.location.href = `/dashboard/compose?edit=${id}`
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tweeti silmek istediğinizden emin misiniz?')) return

    setActionLoading(id)
    try {
      const res = await fetch(`/api/tweets/queue?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTweets(tweets.filter((t) => t.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete tweet:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePostNow = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/browser/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: id }),
      })
      if (res.ok) {
        // Refresh the list
        fetchTweets()
      } else {
        const data = await res.json()
        alert(data.error || 'Tweet paylaşılamadı')
      }
    } catch (error) {
      console.error('Failed to post tweet:', error)
      alert('Tweet paylaşılırken hata oluştu')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Tweet Kuyruğu" subtitle="Zamanlanmış ve geçmiş tweetlerinizi yönetin" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Yükleniyor...</span>
          </div>
        </div>
      </div>
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
            onClick={() => setFilter('SCHEDULED')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'SCHEDULED'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-white border-gray-200 hover:border-yellow-200'
            }`}
          >
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">Bekleyen</p>
          </button>
          <button
            onClick={() => setFilter('POSTED')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'POSTED'
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200 hover:border-green-200'
            }`}
          >
            <p className="text-2xl font-bold text-green-600">{postedCount}</p>
            <p className="text-sm text-gray-500">Paylaşıldı</p>
          </button>
          <button
            onClick={() => setFilter('FAILED')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'FAILED'
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
              {filter === 'all' ? 'Kuyruk boş' : `Bu filtreyle eşleşen tweet yok`}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'Yeni tweet oluşturarak başlayın' : 'Farklı bir filtre deneyin'}
            </p>
            <a
              href="/dashboard/compose"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Tweet Oluştur
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTweets.map((tweet) => (
              <TweetQueueItem
                key={tweet.id}
                tweet={{
                  ...tweet,
                  status: tweet.status.toLowerCase() as any,
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPostNow={handlePostNow}
                disabled={actionLoading === tweet.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
