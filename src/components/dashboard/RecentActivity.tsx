'use client'

import { Card, Badge } from '@/components/common'

interface Activity {
  id: string
  type: 'tweet' | 'reply' | 'like' | 'follow' | 'analysis'
  message: string
  account?: string
  timestamp: Date
}

interface RecentActivityProps {
  activities: Activity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'tweet':
        return (
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
        )
      case 'reply':
        return (
          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        )
      case 'like':
        return (
          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )
      case 'follow':
        return (
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        )
      case 'analysis':
        return (
          <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        )
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (minutes < 1) return 'Az önce'
    if (minutes < 60) return `${minutes}dk önce`
    if (hours < 24) return `${hours}sa önce`
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(date))
  }

  return (
    <Card title="Son Aktiviteler">
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Henüz aktivite yok</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  {activity.account && (
                    <Badge size="sm">@{activity.account}</Badge>
                  )}
                  <span className="text-xs text-gray-400">{formatTime(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
