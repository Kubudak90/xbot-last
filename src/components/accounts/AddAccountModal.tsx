'use client'

import { useState } from 'react'
import { Modal, Button, Input } from '@/components/common'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { username: string; password: string; email?: string }) => Promise<void>
}

export default function AddAccountModal({ isOpen, onClose, onSubmit }: AddAccountModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gereklidir')
      return
    }

    setLoading(true)
    try {
      await onSubmit({ username, password, email: email || undefined })
      setUsername('')
      setPassword('')
      setEmail('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yeni Hesap Ekle" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <Input
          label="X Kullanıcı Adı"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <Input
          label="Şifre"
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="E-posta (Opsiyonel)"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="2FA veya doğrulama için gerekebilir"
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            İptal
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-1"
          >
            Hesap Ekle
          </Button>
        </div>
      </form>
    </Modal>
  )
}
