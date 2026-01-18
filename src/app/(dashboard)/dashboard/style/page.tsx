'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { StyleProfile } from '@/components/analytics'
import { Card, Select, Button } from '@/components/common'

// Mock data
const mockStyleData = {
  toneAnalysis: {
    formal: 0.2,
    casual: 0.5,
    humorous: 0.3,
    serious: 0.15,
    inspirational: 0.25,
  },
  vocabularyStyle: {
    averageWordLength: 5.2,
    hashtagUsage: 0.35,
    emojiUsage: 0.2,
    commonWords: ['teknoloji', 'yapay', 'zeka', 'kod', 'geliştirme', 'proje', 'öğrenmek', 'paylaşmak'],
    commonPhrases: ['bence', 'aslında', 'bir bakın', 'ne düşünüyorsunuz'],
  },
  topicPreferences: [
    { topic: 'Teknoloji', percentage: 35 },
    { topic: 'Programlama', percentage: 28 },
    { topic: 'Yapay Zeka', percentage: 20 },
    { topic: 'Kariyer', percentage: 10 },
    { topic: 'Kişisel', percentage: 7 },
  ],
  postingPatterns: {
    preferredHours: [9, 10, 11, 14, 15, 20, 21, 22],
    averageTweetsPerDay: 3.2,
    mostActiveDay: 'Tuesday',
  },
}

const mockAccounts = [
  { value: 'example', label: '@example' },
  { value: 'testuser', label: '@testuser' },
]

export default function StylePage() {
  const [selectedAccount, setSelectedAccount] = useState('example')
  const [profile, setProfile] = useState(mockStyleData)
  const [loading, setLoading] = useState(false)
  const [analyzedTweets, setAnalyzedTweets] = useState(150)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(new Date(Date.now() - 1000 * 60 * 60 * 24 * 2))

  const handleAnalyze = async () => {
    setLoading(true)
    // TODO: Implement actual analysis via API
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setAnalyzedTweets((prev) => prev + 50)
    setLastAnalyzedAt(new Date())
    setLoading(false)
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Stil Profili"
        subtitle="Tweet stilinizi analiz edin ve geliştirin"
      />

      <div className="p-6">
        {/* Account Selector */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Select
                label="Hesap Seç"
                options={mockAccounts}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <Button
                variant="primary"
                onClick={handleAnalyze}
                loading={loading}
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
        <StyleProfile
          profile={profile}
          accountUsername={selectedAccount}
          analyzedTweets={analyzedTweets}
          lastAnalyzedAt={lastAnalyzedAt}
          onAnalyze={handleAnalyze}
          loading={loading}
        />
      </div>
    </div>
  )
}
