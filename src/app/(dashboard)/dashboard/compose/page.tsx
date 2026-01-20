'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout'
import { TweetComposer } from '@/components/tweets'

interface Account {
  id: string
  username: string
  displayName?: string
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setAccounts(data.data)
          if (data.data.length > 0) {
            setSelectedAccountId(data.data[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const handlePost = async (content: string, scheduledFor?: Date) => {
    if (!selectedAccountId) {
      setError('Lütfen bir hesap seçin')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // First create the tweet in database
      const createRes = await fetch('/api/tweets/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          content,
          scheduledFor: scheduledFor?.toISOString(),
          status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
        }),
      })

      if (!createRes.ok) {
        const data = await createRes.json()
        throw new Error(data.error || 'Tweet oluşturulamadı')
      }

      const createData = await createRes.json()

      // If not scheduled, post immediately
      if (!scheduledFor) {
        const postRes = await fetch('/api/browser/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tweetId: createData.data.id }),
        })

        if (!postRes.ok) {
          const data = await postRes.json()
          throw new Error(data.error || 'Tweet paylaşılamadı')
        }
        setSuccess('Tweet başarıyla paylaşıldı!')
      } else {
        setSuccess('Tweet zamanlandı!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (options: { type: string; topic?: string; tone?: string }) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: options.topic || `Generate a ${options.type} tweet about technology`,
          options: {
            maxLength: 280,
            temperature: options.type === 'engaging' ? 0.9 : 0.7,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Tweet oluşturulamadı')
      }

      const data = await res.json()
      if (data.success && data.data?.tweet) {
        return data.data.tweet
      }

      throw new Error('Geçersiz API yanıtı')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI hatası')
      return null
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Tweet Oluştur"
        subtitle="AI destekli tweet oluşturucu"
      />

      <div className="p-6 max-w-3xl">
        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hesap Seç
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username} {account.displayName && `(${account.displayName})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {accounts.length === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-800">
              Henüz bir X hesabı eklenmemiş.{' '}
              <a href="/dashboard/accounts" className="underline font-medium">
                Hesap ekleyin
              </a>
            </p>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
            {success}
          </div>
        )}

        <TweetComposer
          onPost={handlePost}
          onGenerate={handleGenerate}
          disabled={loading || accounts.length === 0}
        />

        {loading && (
          <div className="mt-4 flex items-center justify-center text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            İşleniyor...
          </div>
        )}
      </div>
    </div>
  )
}
