'use client'

import { useState } from 'react'
import { Modal, Button, Input, TextArea } from '@/components/common'

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

type LoginMethod = 'cookie' | 'browser'
type Step = 'method' | 'credentials' | 'cookie' | 'twoFactor' | 'emailVerification'

export default function LoginModal({ isOpen, onClose, accountId, username, onLogin }: LoginModalProps) {
  const [step, setStep] = useState<Step>('method')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('cookie')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [ct0, setCt0] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCookieLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/accounts/login-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          authToken: authToken.trim(),
          ct0: ct0.trim(),
        }),
      })

      const result = await res.json()

      if (result.success) {
        resetForm()
        onClose()
        window.location.reload() // Refresh to show updated status
      } else {
        setError(result.error || 'Cookie ile giriş başarısız')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleBrowserLogin = async (e: React.FormEvent) => {
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
    setStep('method')
    setLoginMethod('cookie')
    setPassword('')
    setEmail('')
    setTwoFactorCode('')
    setAuthToken('')
    setCt0('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const selectMethod = (method: LoginMethod) => {
    setLoginMethod(method)
    setStep(method === 'cookie' ? 'cookie' : 'credentials')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`@${username} - Giriş`} size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Method Selection */}
        {step === 'method' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <strong>@{username}</strong> hesabına nasıl giriş yapmak istersiniz?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => selectMethod('cookie')}
                className="w-full p-4 text-left border-2 border-green-200 bg-green-50 rounded-xl hover:border-green-400 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Cookie ile Giriş (Önerilen)</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Tarayıcınızdan auth_token ve ct0 cookie&apos;lerini kopyalayarak giriş yapın. Hızlı ve güvenilir.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => selectMethod('browser')}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Tarayıcı Otomasyonu</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Şifre ile otomatik giriş. Uzun sürebilir ve timeout olabilir.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Cookie Login */}
        {step === 'cookie' && (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Cookie Nasıl Alınır?</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>X.com&apos;a tarayıcınızdan giriş yapın</li>
                <li>F12 ile DevTools açın</li>
                <li>Application &gt; Cookies &gt; x.com gidin</li>
                <li><code className="bg-blue-100 px-1 rounded">auth_token</code> ve <code className="bg-blue-100 px-1 rounded">ct0</code> değerlerini kopyalayın</li>
              </ol>
            </div>

            <Input
              label="auth_token"
              placeholder="d95d5072403d8264d774d53dd8fe77253d0c746b"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              required
            />

            <TextArea
              label="ct0"
              placeholder="6d74a7803e04a53b4c9ac1b6121fae9b..."
              value={ct0}
              onChange={(e) => setCt0(e.target.value)}
              rows={3}
              required
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('method')}
                className="flex-1"
              >
                Geri
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={loading}
                onClick={handleCookieLogin}
                disabled={!authToken.trim() || !ct0.trim()}
                className="flex-1"
              >
                Giriş Yap
              </Button>
            </div>
          </>
        )}

        {/* Browser Login - Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleBrowserLogin} className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Not:</strong> Tarayıcı otomasyonu uzun sürebilir ve bazen timeout olabilir.
                Cookie ile giriş daha güvenilirdir.
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('method')}
                className="flex-1"
              >
                Geri
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="flex-1"
              >
                Giriş Yap
              </Button>
            </div>
          </form>
        )}

        {/* 2FA Step */}
        {step === 'twoFactor' && (
          <form onSubmit={handleBrowserLogin} className="space-y-4">
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
                Doğrula
              </Button>
            </div>
          </form>
        )}

        {/* Email Verification Step */}
        {step === 'emailVerification' && (
          <form onSubmit={handleBrowserLogin} className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                E-posta doğrulaması gerekiyor. E-posta adresinizi girin.
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
                Doğrula
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
