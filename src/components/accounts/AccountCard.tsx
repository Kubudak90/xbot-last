'use client'

import { Badge, Button } from '@/components/common'

interface Account {
  id: string
  username: string
  displayName: string | null
  status: string
  isActive: boolean
  lastActiveAt: Date | null
}

interface AccountCardProps {
  account: Account
  onLogin: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export default function AccountCard({ account, onLogin, onEdit, onDelete }: AccountCardProps) {
  const getStatusBadge = () => {
    switch (account.status) {
      case 'active':
        return <Badge variant="success">Aktif</Badge>
      case 'inactive':
        return <Badge variant="default">Pasif</Badge>
      case 'suspended':
        return <Badge variant="danger">Askıda</Badge>
      case 'error':
        return <Badge variant="warning">Hata</Badge>
      default:
        return <Badge>{account.status}</Badge>
    }
  }

  const formatLastActive = (date: Date | null) => {
    if (!date) return 'Hiç aktif olmadı'
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Az önce'
    if (minutes < 60) return `${minutes} dakika önce`
    if (hours < 24) return `${hours} saat önce`
    return `${days} gün önce`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {account.username.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-gray-900">
              {account.displayName || account.username}
            </h3>
            <p className="text-sm text-gray-500">@{account.username}</p>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge()}
              <span className="text-xs text-gray-400">
                {formatLastActive(account.lastActiveAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {account.status !== 'active' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onLogin(account.id)}
            >
              Giriş Yap
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(account.id)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(account.id)}
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Tweet</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Bekleyen</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">0%</p>
          <p className="text-xs text-gray-500">Stil Eşleşme</p>
        </div>
      </div>
    </div>
  )
}
