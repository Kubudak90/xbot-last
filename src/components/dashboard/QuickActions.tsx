'use client'

import Link from 'next/link'
import { Card } from '@/components/common'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

const actions: QuickAction[] = [
  {
    title: 'Yeni Tweet',
    description: 'AI ile tweet oluştur',
    href: '/dashboard/compose',
    color: 'bg-blue-500',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    title: 'Stil Analizi',
    description: 'Tweetlerini analiz et',
    href: '/dashboard/style',
    color: 'bg-purple-500',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    title: 'Trendleri Gör',
    description: 'Güncel trendleri keşfet',
    href: '/dashboard/trends',
    color: 'bg-green-500',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Hesap Ekle',
    description: 'Yeni X hesabı bağla',
    href: '/dashboard/accounts',
    color: 'bg-orange-500',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
]

export default function QuickActions() {
  return (
    <Card title="Hızlı İşlemler">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className={`w-10 h-10 ${action.color} text-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
              {action.icon}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{action.title}</p>
              <p className="text-xs text-gray-500">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
