'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Card, Button, Input, Select, Badge } from '@/components/common'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai')

  const tabs = [
    { id: 'ai', name: 'AI Sağlayıcıları' },
    { id: 'behavior', name: 'Davranış Ayarları' },
    { id: 'notifications', name: 'Bildirimler' },
    { id: 'advanced', name: 'Gelişmiş' },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Ayarlar"
        subtitle="XBot yapılandırmasını özelleştirin"
      />

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* AI Providers Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* OpenAI */}
            <Card title="OpenAI" action={<Badge variant="success">Aktif</Badge>}>
              <div className="space-y-4">
                <Input
                  label="API Key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue="sk-••••••••••••••••••••"
                />
                <Select
                  label="Model"
                  options={[
                    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                    { value: 'gpt-4', label: 'GPT-4' },
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                  ]}
                  defaultValue="gpt-4-turbo"
                />
                <div className="flex gap-2">
                  <Input
                    label="Öncelik"
                    type="number"
                    defaultValue="1"
                    className="w-24"
                  />
                </div>
              </div>
            </Card>

            {/* Claude */}
            <Card title="Claude (Anthropic)" action={<Badge variant="success">Aktif</Badge>}>
              <div className="space-y-4">
                <Input
                  label="API Key"
                  type="password"
                  placeholder="sk-ant-..."
                  defaultValue="sk-ant-••••••••••••••••••••"
                />
                <Select
                  label="Model"
                  options={[
                    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
                    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
                    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
                  ]}
                  defaultValue="claude-3-sonnet"
                />
                <div className="flex gap-2">
                  <Input
                    label="Öncelik"
                    type="number"
                    defaultValue="2"
                    className="w-24"
                  />
                </div>
              </div>
            </Card>

            {/* Gemini */}
            <Card title="Google Gemini" action={<Badge variant="default">Pasif</Badge>}>
              <div className="space-y-4">
                <Input
                  label="API Key"
                  type="password"
                  placeholder="AIza..."
                />
                <Select
                  label="Model"
                  options={[
                    { value: 'gemini-pro', label: 'Gemini Pro' },
                    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
                  ]}
                  defaultValue="gemini-pro"
                />
                <Button variant="secondary" size="sm">
                  Etkinleştir
                </Button>
              </div>
            </Card>

            {/* Ollama */}
            <Card title="Ollama (Lokal)" action={<Badge variant="success">Aktif</Badge>}>
              <div className="space-y-4">
                <Input
                  label="Base URL"
                  placeholder="http://localhost:11434"
                  defaultValue="http://localhost:11434"
                />
                <Select
                  label="Model"
                  options={[
                    { value: 'llama2', label: 'Llama 2' },
                    { value: 'mistral', label: 'Mistral' },
                    { value: 'codellama', label: 'Code Llama' },
                  ]}
                  defaultValue="mistral"
                />
                <div className="flex gap-2">
                  <Input
                    label="Öncelik"
                    type="number"
                    defaultValue="4"
                    className="w-24"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <Card title="İnsan Davranışı Simülasyonu">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Rastgele Gecikmeler</p>
                    <p className="text-sm text-gray-500">Eylemler arasında doğal gecikmeler ekle</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Yazma Simülasyonu</p>
                    <p className="text-sm text-gray-500">Tweet yazarken insan gibi yazma hızı</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Aktif Saatler</p>
                    <p className="text-sm text-gray-500">Sadece belirlenen saatlerde aktif ol</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                </div>
              </div>
            </Card>

            <Card title="Rate Limiting">
              <div className="space-y-4">
                <Input
                  label="Günlük Maksimum Tweet"
                  type="number"
                  defaultValue="50"
                  hint="Günde en fazla kaç tweet atılabilir"
                />
                <Input
                  label="Saatlik Maksimum Beğeni"
                  type="number"
                  defaultValue="100"
                  hint="Saatte en fazla kaç beğeni yapılabilir"
                />
                <Input
                  label="Saatlik Maksimum Yanıt"
                  type="number"
                  defaultValue="30"
                  hint="Saatte en fazla kaç yanıt verilebilir"
                />
              </div>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card title="Bildirim Tercihleri">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tweet Paylaşıldığında</p>
                    <p className="text-sm text-gray-500">Zamanlanmış tweet paylaşıldığında bildir</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Hata Durumunda</p>
                    <p className="text-sm text-gray-500">Bir hata oluştuğunda bildir</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Trend Güncellemeleri</p>
                    <p className="text-sm text-gray-500">İlgi alanlarınızla ilgili trendler</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Haftalık Rapor</p>
                    <p className="text-sm text-gray-500">Haftalık performans özeti</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <Card title="Veritabanı">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">Veritabanı Boyutu</span>
                    <span className="text-sm font-medium">12.5 MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Son Yedekleme</span>
                    <span className="text-sm text-gray-500">2 gün önce</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary">Yedekle</Button>
                  <Button variant="danger">Verileri Temizle</Button>
                </div>
              </div>
            </Card>

            <Card title="Tarayıcı Otomasyonu">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Headless Mod</p>
                    <p className="text-sm text-gray-500">Tarayıcıyı görünmez çalıştır</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Stealth Modu</p>
                    <p className="text-sm text-gray-500">Bot tespitinden kaçınma</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                </div>
                <Input
                  label="User Agent Rotasyonu"
                  type="number"
                  defaultValue="5"
                  hint="Her X oturumda user agent değiştir"
                />
              </div>
            </Card>

            <Card title="Tehlikeli Bölge">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    Bu işlemler geri alınamaz. Dikkatli olun!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="danger">Tüm Oturumları Kapat</Button>
                  <Button variant="danger">Hesabı Sil</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button variant="primary">Ayarları Kaydet</Button>
        </div>
      </div>
    </div>
  )
}
