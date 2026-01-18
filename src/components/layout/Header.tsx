'use client'

import { useState } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Actions */}
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Yeni Tweet</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-600">Tweet kuyruğunda 3 tweet bekliyor</p>
                    <span className="text-xs text-gray-400">2 dakika önce</span>
                  </div>
                  <div className="p-4 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-600">Stil analizi tamamlandı</p>
                    <span className="text-xs text-gray-400">1 saat önce</span>
                  </div>
                  <div className="p-4 hover:bg-gray-50">
                    <p className="text-sm text-gray-600">Yeni trend tespit edildi: #teknoloji</p>
                    <span className="text-xs text-gray-400">3 saat önce</span>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-700 w-full text-center">
                    Tümünü gör
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Ara..."
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  )
}
