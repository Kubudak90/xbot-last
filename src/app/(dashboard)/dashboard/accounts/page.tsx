'use client'

import { useState, useEffect } from 'react'
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loginModal, setLoginModal] = useState<{ isOpen: boolean; accountId: string; username: string }>({
    isOpen: false,
    accountId: '',
    username: '',
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setAccounts(data.data.map((a: any) => ({
            ...a,
            lastActiveAt: a.lastActiveAt ? new Date(a.lastActiveAt) : null,
          })))
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (data: { username: string; password: string; email?: string }) => {
    try {
      // First create the account
      const createRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username }),
      })

      if (!createRes.ok) {
        const errorData = await createRes.json()
        alert(errorData.error || 'Hesap oluşturulamadı')
        return
      }

      const createData = await createRes.json()
      const accountId = createData.data.id

      // Then attempt login via browser automation
      const loginRes = await fetch('/api/browser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          username: data.username,
          password: data.password,
          email: data.email,
        }),
      })

      if (loginRes.ok) {
        fetchAccounts() // Refresh the list
      } else {
        const loginData = await loginRes.json()
        alert(loginData.error || 'Giriş başarısız')
      }
    } catch (error) {
      console.error('Failed to add account:', error)
      alert('Hesap eklenirken hata oluştu')
    }
  }

  const handleLogin = async (data: {
    accountId: string
    username: string
    password: string
    email?: string
    twoFactorCode?: string
  }) => {
    try {
      const res = await fetch('/api/browser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        fetchAccounts() // Refresh the list
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Giriş başarısız' }
      }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: 'Bağlantı hatası' }
    }
  }

  const handleEdit = (id: string) => {
    // Could open an edit modal
    console.log('Edit:', id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinizden emin misiniz?')) return

    try {
      const res = await fetch(`/api/accounts?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  const openLoginModal = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (account) {
      setLoginModal({ isOpen: true, accountId: id, username: account.username })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Hesaplar" subtitle="X hesaplarınızı yönetin" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Yükleniyor...</span>
          </div>
        </div>
      </div>
    )
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
