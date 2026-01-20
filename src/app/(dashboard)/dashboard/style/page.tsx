'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout'
import { StyleProfile } from '@/components/analytics'
import { Card, Select, Button, Loading } from '@/components/common'

interface Account {
  id: string
  username: string
}

interface StyleData {
  toneAnalysis: {
    formal: number
    casual: number
    humorous: number
    serious: number
    inspirational: number
  }
  vocabularyStyle: {
    averageWordLength: number
    hashtagUsage: number
    emojiUsage: number
    commonWords: string[]
    commonPhrases: string[]
  }
  topicPreferences: Array<{ topic: string; percentage: number }>
  postingPatterns: {
    preferredHours: number[]
    averageTweetsPerDay: number
    mostActiveDay: string
  }
}

const defaultStyleData: StyleData = {
  toneAnalysis: {
    formal: 0,
    casual: 0,
    humorous: 0,
    serious: 0,
    inspirational: 0,
  },
  vocabularyStyle: {
    averageWordLength: 0,
    hashtagUsage: 0,
    emojiUsage: 0,
    commonWords: [],
    commonPhrases: [],
  },
  topicPreferences: [],
  postingPatterns: {
    preferredHours: [],
    averageTweetsPerDay: 0,
    mostActiveDay: '',
  },
}

export default function StylePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [profile, setProfile] = useState<StyleData>(defaultStyleData)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzedTweets, setAnalyzedTweets] = useState(0)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  // Fetch accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch('/api/accounts')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setAccounts(data.data)
            if (data.data.length > 0) {
              setSelectedAccount(data.data[0].id)
            }
          }
        }
      } catch (error) {
        console.error('Accounts fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Fetch style profile when account changes
  useEffect(() => {
    if (!selectedAccount) return

    async function fetchProfile() {
      setLoading(true)
      try {
        const res = await fetch(`/api/style/analyze?accountId=${selectedAccount}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            const profileData = data.data

            // Map API data to component format
            const toneAnalysis = profileData.toneAnalysis || {}
            const vocabStyle = profileData.vocabularyStyle || {}
            const topicPrefs = profileData.topicPreferences || {}
            const postPatterns = profileData.postingPatterns || {}

            setProfile({
              toneAnalysis: {
                formal: toneAnalysis.formality || 0,
                casual: 1 - (toneAnalysis.formality || 0),
                humorous: toneAnalysis.humor || 0,
                serious: toneAnalysis.confidence || 0,
                inspirational: toneAnalysis.enthusiasm || 0,
              },
              vocabularyStyle: {
                averageWordLength: vocabStyle.averageWordLength || 0,
                hashtagUsage: vocabStyle.hashtagDensity || 0,
                emojiUsage: vocabStyle.emojiDensity || 0,
                commonWords: vocabStyle.topWords || [],
                commonPhrases: vocabStyle.signaturePhrases || [],
              },
              topicPreferences: (topicPrefs.primaryTopics || []).map((topic: string, index: number) => ({
                topic,
                percentage: Math.round(100 / (topicPrefs.primaryTopics?.length || 1) - index * 5),
              })),
              postingPatterns: {
                preferredHours: postPatterns.peakHours || [],
                averageTweetsPerDay: postPatterns.averageTweetsPerDay || 0,
                mostActiveDay: postPatterns.preferredDays?.[0] || '',
              },
            })

            setAnalyzedTweets(profileData.analyzedTweets || 0)
            setLastAnalyzedAt(profileData.lastAnalyzedAt ? new Date(profileData.lastAnalyzedAt) : null)
            setHasProfile(true)
          }
        } else if (res.status === 404) {
          // No profile yet
          setProfile(defaultStyleData)
          setAnalyzedTweets(0)
          setLastAnalyzedAt(null)
          setHasProfile(false)
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
        setHasProfile(false)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [selectedAccount])

  const handleAnalyze = async () => {
    if (!selectedAccount) return

    setAnalyzing(true)
    try {
      // In a real implementation, this would fetch tweets from X and analyze them
      // For now, we show a message that analysis requires tweet data
      alert('Stil analizi için önce hesabınıza giriş yapıp tweet verilerinizi yüklemeniz gerekiyor.')
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `@${acc.username}`,
  }))

  if (loading && accounts.length === 0) {
    return (
      <div className="min-h-screen">
        <Header
          title="Stil Profili"
          subtitle="Tweet stilinizi analiz edin ve geliştirin"
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
        title="Stil Profili"
        subtitle="Tweet stilinizi analiz edin ve geliştirin"
      />

      <div className="p-6">
        {accounts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Hesap Bulunamadı</h3>
              <p className="text-gray-500 mb-4">Stil analizi için önce bir X hesabı eklemeniz gerekiyor.</p>
              <Button variant="primary" onClick={() => window.location.href = '/dashboard/accounts'}>
                Hesap Ekle
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Account Selector */}
            <Card className="mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Select
                    label="Hesap Seç"
                    options={accountOptions}
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  />
                </div>
                <div className="pt-6">
                  <Button
                    variant="primary"
                    onClick={handleAnalyze}
                    loading={analyzing}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    }
                  >
                    Analiz Et
                  </Button>
                </div>
              </div>
            </Card>

            {/* Style Profile */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : hasProfile ? (
              <StyleProfile
                profile={profile}
                accountUsername={accounts.find(a => a.id === selectedAccount)?.username || ''}
                analyzedTweets={analyzedTweets}
                lastAnalyzedAt={lastAnalyzedAt}
                onAnalyze={handleAnalyze}
                loading={analyzing}
              />
            ) : (
              <Card>
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Analiz Yapılmadı</h3>
                  <p className="text-gray-500 mb-4">
                    Bu hesap için stil profili oluşturmak için &quot;Analiz Et&quot; butonuna tıklayın.
                  </p>
                  <Button variant="primary" onClick={handleAnalyze} loading={analyzing}>
                    Analiz Başlat
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
