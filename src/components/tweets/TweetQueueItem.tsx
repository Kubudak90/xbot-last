'use client'

import { Badge, Button } from '@/components/common'

interface ScheduledTweet {
  id: string
  content: string
  status: string
  scheduledFor: Date | null
  createdAt: Date
  account: {
    username: string
  }
}

interface TweetQueueItemProps {
  tweet: ScheduledTweet
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onPostNow: (id: string) => void
}

export default function TweetQueueItem({ tweet, onEdit, onDelete, onPostNow }: TweetQueueItemProps) {
  const getStatusBadge = () => {
    switch (tweet.status) {
      case 'pending':
        return <Badge variant="info">Bekliyor</Badge>
      case 'processing':
        return <Badge variant="warning">İşleniyor</Badge>
      case 'posted':
        return <Badge variant="success">Paylaşıldı</Badge>
      case 'failed':
        return <Badge variant="danger">Başarısız</Badge>
      case 'cancelled':
        return <Badge variant="default">İptal</Badge>
      default:
        return <Badge>{tweet.status}</Badge>
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Zamansız'
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const isPending = tweet.status === 'pending'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              @{tweet.account.username}
            </span>
            {getStatusBadge()}
          </div>

          {/* Content */}
          <p className="text-gray-900 break-words">{tweet.content}</p>

          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(tweet.scheduledFor)}
            </span>
            <span>{tweet.content.length}/280 karakter</span>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onPostNow(tweet.id)}
            >
              Şimdi Paylaş
            </Button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(tweet.id)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(tweet.id)}
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
