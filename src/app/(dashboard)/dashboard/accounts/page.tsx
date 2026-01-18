'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Button } from '@/components/common'
import { AccountCard, AddAccountModal, LoginModal } from '@/components/accounts'

interface Account {
  id: string
  username: string
  displayName: string | null
  status: string
  isActive: boolean
  lastActiveAt: Date | null
}

// Mock data
const mockAccounts: Account[] = [
  { id: '1', username: 'example', displayName: 'Example User', status: 'active', isActive: true, lastActiveAt: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '2', username: 'testuser', displayName: 'Test User', status: 'inactive', isActive: true, lastActiveAt: null },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loginModal, setLoginModal] = useState<{ isOpen: boolean; accountId: string; username: string }>({
    isOpen: false,
    accountId: '',
    username: '',
  })

  const handleAddAccount = async (data: { username: string; password: string; email?: string }) => {
    // TODO: Implement actual account creation
    const newAccount = {
      id: Date.now().toString(),
      username: data.username,
      displayName: null,
      status: 'inactive',
      isActive: true,
      lastActiveAt: null,
    }
    setAccounts([...accounts, newAccount])
  }

  const handleLogin = async (data: {
    accountId: string
    username: string
    password: string
    email?: string
    twoFactorCode?: string
  }) => {
    // TODO: Implement actual login via API
    console.log('Login:', data)
    return { success: true }
  }

  const handleEdit = (id: string) => {
    console.log('Edit:', id)
  }

  const handleDelete = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id))
  }

  const openLoginModal = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (account) {
      setLoginModal({ isOpen: true, accountId: id, username: account.username })
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Hesaplar"
        subtitle="X hesaplarınızı yönetin"
      />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              {accounts.length} hesap bağlı
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Hesap Ekle
          </Button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz hesap yok</h3>
            <p className="text-gray-500 mb-4">İlk X hesabınızı ekleyerek başlayın</p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              Hesap Ekle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onLogin={openLoginModal}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAccount}
      />

      <LoginModal
        isOpen={loginModal.isOpen}
        onClose={() => setLoginModal({ isOpen: false, accountId: '', username: '' })}
        accountId={loginModal.accountId}
        username={loginModal.username}
        onLogin={handleLogin}
      />
    </div>
  )
}
