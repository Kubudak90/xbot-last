'use client'

import { Card, Badge, Button } from '@/components/common'

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
  topicPreferences: {
    topic: string
    percentage: number
  }[]
  postingPatterns: {
    preferredHours: number[]
    averageTweetsPerDay: number
    mostActiveDay: string
  }
}

interface StyleProfileProps {
  profile: StyleData | null
  accountUsername: string
  analyzedTweets: number
  lastAnalyzedAt: Date | null
  onAnalyze: () => void
  loading?: boolean
}

export default function StyleProfile({
  profile,
  accountUsername,
  analyzedTweets,
  lastAnalyzedAt,
  onAnalyze,
  loading,
}: StyleProfileProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Hiç analiz edilmedi'
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getToneLabel = (key: string) => {
    const labels: Record<string, string> = {
      formal: 'Resmi',
      casual: 'Günlük',
      humorous: 'Esprili',
      serious: 'Ciddi',
      inspirational: 'İlham Verici',
    }
    return labels[key] || key
  }

  const getDayLabel = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
      sunday: 'Pazar',
    }
    return days[day.toLowerCase()] || day
  }

  if (!profile) {
    return (
      <Card title={`@${accountUsername} Stil Profili`}>
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Stil Analizi Gerekli</h3>
          <p className="text-gray-500 mb-4">
            Tweet stilinizi analiz etmek için en az 20 tweet gerekli.
          </p>
          <Button variant="primary" onClick={onAnalyze} loading={loading}>
            Analiz Başlat
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">@{accountUsername}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {analyzedTweets} tweet analiz edildi • Son: {formatDate(lastAnalyzedAt)}
            </p>
          </div>
          <Button variant="secondary" onClick={onAnalyze} loading={loading}>
            Yeniden Analiz Et
          </Button>
        </div>
      </Card>

      {/* Tone Analysis */}
      <Card title="Ton Analizi" subtitle="Yazım stilinizin dağılımı">
        <div className="space-y-4">
          {Object.entries(profile.toneAnalysis).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{getToneLabel(key)}</span>
                <span className="text-sm font-medium text-gray-900">{Math.round(value * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Topic Preferences */}
      <Card title="İlgi Alanları" subtitle="En çok bahsettiğiniz konular">
        <div className="flex flex-wrap gap-2">
          {profile.topicPreferences.map((topic, index) => (
            <Badge
              key={index}
              variant={index < 3 ? 'info' : 'default'}
              size="md"
            >
              {topic.topic} ({Math.round(topic.percentage)}%)
            </Badge>
          ))}
        </div>
      </Card>

      {/* Vocabulary Style */}
      <Card title="Kelime Kullanımı">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {profile.vocabularyStyle.averageWordLength.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ort. Kelime Uzunluğu</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(profile.vocabularyStyle.hashtagUsage * 100)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Hashtag Kullanımı</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(profile.vocabularyStyle.emojiUsage * 100)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Emoji Kullanımı</p>
          </div>
        </div>

        {profile.vocabularyStyle.commonWords.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Sık Kullanılan Kelimeler</p>
            <div className="flex flex-wrap gap-2">
              {profile.vocabularyStyle.commonWords.slice(0, 10).map((word, index) => (
                <Badge key={index} variant="default" size="sm">{word}</Badge>
              ))}
            </div>
          </div>
        )}

        {profile.vocabularyStyle.commonPhrases.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Sık Kullanılan İfadeler</p>
            <div className="flex flex-wrap gap-2">
              {profile.vocabularyStyle.commonPhrases.slice(0, 5).map((phrase, index) => (
                <Badge key={index} variant="info" size="sm">{phrase}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Posting Patterns */}
      <Card title="Paylaşım Alışkanlıkları">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {profile.postingPatterns.averageTweetsPerDay.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Günlük Ortalama Tweet</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {getDayLabel(profile.postingPatterns.mostActiveDay)}
            </p>
            <p className="text-xs text-gray-500 mt-1">En Aktif Gün</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Tercih Edilen Saatler</p>
          <div className="flex gap-1">
            {Array.from({ length: 24 }, (_, i) => {
              const isActive = profile.postingPatterns.preferredHours.includes(i)
              return (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-sm ${
                    isActive ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                  title={`${i}:00`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">00:00</span>
            <span className="text-xs text-gray-400">12:00</span>
            <span className="text-xs text-gray-400">23:00</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
