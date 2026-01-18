'use client'

import { useState } from 'react'
import { Modal, Button, Input } from '@/components/common'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  username: string
  onLogin: (data: {
    accountId: string
    username: string
    password: string
    email?: string
    twoFactorCode?: string
  }) => Promise<{ success: boolean; requiresTwoFactor?: boolean; requiresEmailVerification?: boolean; error?: string }>
}

type Step = 'credentials' | 'twoFactor' | 'emailVerification'

export default function LoginModal({ isOpen, onClose, accountId, username, onLogin }: LoginModalProps) {
  const [step, setStep] = useState<Step>('credentials')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await onLogin({
        accountId,
        username,
        password,
        email: email || undefined,
        twoFactorCode: twoFactorCode || undefined,
      })

      if (result.success) {
        resetForm()
        onClose()
      } else if (result.requiresTwoFactor) {
        setStep('twoFactor')
      } else if (result.requiresEmailVerification) {
        setStep('emailVerification')
      } else {
        setError(result.error || 'Giriş başarısız')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep('credentials')
    setPassword('')
    setEmail('')
    setTwoFactorCode('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`@${username} - Giriş`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 'credentials' && (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>@{username}</strong> hesabına giriş yapılacak.
                Tarayıcı otomasyonu ile giriş işlemi başlatılacaktır.
              </p>
            </div>

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
              hint="X doğrulama isterse kullanılacak"
            />
          </>
        )}

        {step === 'twoFactor' && (
          <>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                İki faktörlü doğrulama gerekiyor. Lütfen doğrulama kodunuzu girin.
              </p>
            </div>

            <Input
              label="2FA Kodu"
              placeholder="123456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              maxLength={6}
              required
            />
          </>
        )}

        {step === 'emailVerification' && (
          <>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                E-posta doğrulaması gerekiyor. E-posta adresinizi girin ve doğrulama kodunu bekleyin.
              </p>
            </div>

            <Input
              label="E-posta"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
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
            {step === 'credentials' ? 'Giriş Yap' : 'Doğrula'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
