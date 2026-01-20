'use client'

import { useState } from 'react'
import { Button, TextArea, Select, Badge, Card } from '@/components/common'

interface TweetComposerProps {
  accountId?: string
  onPost: (content: string, scheduledFor?: Date) => Promise<void>
  onGenerate: (options: GenerateOptions) => Promise<string | null>
  disabled?: boolean
}

interface GenerateOptions {
  type: string
  topic?: string
  tone?: string
  keywords?: string[]
}

const tweetTypes = [
  { value: 'informative', label: 'Bilgilendirici' },
  { value: 'engaging', label: 'Etkileşimli' },
  { value: 'promotional', label: 'Tanıtım' },
  { value: 'personal', label: 'Kişisel' },
  { value: 'question', label: 'Soru' },
  { value: 'announcement', label: 'Duyuru' },
  { value: 'thread_hook', label: 'Thread Başlangıcı' },
  { value: 'controversial', label: 'Tartışmalı' },
]

const tones = [
  { value: 'professional', label: 'Profesyonel' },
  { value: 'casual', label: 'Günlük' },
  { value: 'humorous', label: 'Esprili' },
  { value: 'inspirational', label: 'İlham Verici' },
  { value: 'educational', label: 'Eğitici' },
]

export default function TweetComposer({ onPost, onGenerate, disabled = false }: TweetComposerProps) {
  const [content, setContent] = useState('')
  const [tweetType, setTweetType] = useState('engaging')
  const [tone, setTone] = useState('casual')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const charCount = content.length
  const maxChars = 280

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const generated = await onGenerate({
        type: tweetType,
        topic: topic || undefined,
        tone,
      })
      if (generated) {
        setContent(generated)
      }
    } catch (error) {
      console.error('Generate error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateSuggestions = async () => {
    setGenerating(true)
    try {
      const results: string[] = []
      for (let i = 0; i < 3; i++) {
        const generated = await onGenerate({
          type: tweetType,
          topic: topic || undefined,
          tone,
        })
        if (generated) {
          results.push(generated)
        }
      }
      setSuggestions(results)
    } catch (error) {
      console.error('Generate suggestions error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handlePost = async () => {
    if (!content.trim() || charCount > maxChars) return

    setLoading(true)
    try {
      let scheduledFor: Date | undefined
      if (showSchedule && scheduleDate && scheduleTime) {
        scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`)
      }
      await onPost(content, scheduledFor)
      setContent('')
      setSuggestions([])
    } catch (error) {
      console.error('Post error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Generation Options */}
      <Card title="AI Tweet Oluşturucu">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tweet Tipi"
              options={tweetTypes}
              value={tweetType}
              onChange={(e) => setTweetType(e.target.value)}
            />
            <Select
              label="Ton"
              options={tones}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konu (Opsiyonel)
            </label>
            <input
              type="text"
              placeholder="Örn: yapay zeka, teknoloji, spor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleGenerate}
              loading={generating}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              AI ile Oluştur
            </Button>
            <Button
              variant="ghost"
              onClick={handleGenerateSuggestions}
              loading={generating}
            >
              3 Öneri Getir
            </Button>
          </div>
        </div>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card title="Öneriler">
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setContent(suggestion)
                  setSuggestions([])
                }}
              >
                <p className="text-sm text-gray-700">{suggestion}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge size="sm">{suggestion.length}/280</Badge>
                  <span className="text-xs text-gray-400">Seçmek için tıkla</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Composer */}
      <Card title="Tweet İçeriği">
        <div className="space-y-4">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ne düşünüyorsun?"
            rows={4}
            charCount={charCount}
            maxChars={maxChars}
          />

          {/* Schedule Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="schedule"
              checked={showSchedule}
              onChange={(e) => setShowSchedule(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="schedule" className="text-sm text-gray-600">
              Zamanla
            </label>
          </div>

          {showSchedule && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saat
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={charCount > maxChars ? 'danger' : 'default'}>
                {charCount}/{maxChars}
              </Badge>
              <Button
                variant="primary"
                onClick={handlePost}
                loading={loading}
                disabled={!content.trim() || charCount > maxChars}
              >
                {showSchedule ? 'Zamanla' : 'Paylaş'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
