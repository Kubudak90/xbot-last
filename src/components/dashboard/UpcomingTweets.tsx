'use client'

import Link from 'next/link'
import { Card, Badge, Button } from '@/components/common'

interface ScheduledTweet {
  id: string
  content: string
  scheduledFor: Date | null
  account: {
    username: string
  }
}

interface UpcomingTweetsProps {
  tweets: ScheduledTweet[]
}

export default function UpcomingTweets({ tweets }: UpcomingTweetsProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Zamansız'
    const d = new Date(date)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (diff < 0) return 'Gecikmiş'
    if (hours < 1) return `${minutes}dk sonra`
    if (hours < 24) return `${hours}sa sonra`

    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  return (
    <Card
      title="Yaklaşan Tweetler"
      action={
        <Link href="/dashboard/queue">
          <Button variant="ghost" size="sm">
            Tümünü Gör
          </Button>
        </Link>
      }
    >
      <div className="space-y-3">
        {tweets.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-sm">Zamanlanmış tweet yok</p>
            <Link href="/dashboard/compose" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
              Tweet oluştur
            </Link>
          </div>
        ) : (
          tweets.slice(0, 5).map((tweet) => (
            <div key={tweet.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-900 line-clamp-2">{tweet.content}</p>
              <div className="flex items-center justify-between mt-2">
                <Badge size="sm">@{tweet.account.username}</Badge>
                <span className="text-xs text-gray-500">{formatDate(tweet.scheduledFor)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
