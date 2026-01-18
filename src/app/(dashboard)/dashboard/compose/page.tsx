'use client'

import { Header } from '@/components/layout'
import { TweetComposer } from '@/components/tweets'

export default function ComposePage() {
  const handlePost = async (content: string, scheduledFor?: Date) => {
    // TODO: Implement actual posting via API
    console.log('Post:', { content, scheduledFor })
  }

  const handleGenerate = async (options: { type: string; topic?: string; tone?: string }) => {
    // TODO: Implement actual AI generation via API
    const mockTweets: Record<string, string[]> = {
      informative: [
        'Yapay zeka teknolojileri her geçen gün daha da gelişiyor. Özellikle dil modelleri alanında yaşanan yenilikler, iş dünyasını kökten değiştiriyor.',
        'Veri bilimi ve makine öğrenimi, modern yazılım geliştirmenin temel taşları haline geldi.',
        'Cloud computing sayesinde artık küçük ekipler bile büyük ölçekli projeler geliştirebiliyor.',
      ],
      engaging: [
        'Hafta sonu kodlama zamanı! Siz hangi proje üzerinde çalışıyorsunuz? 🚀',
        'En sevdiğiniz programlama dili hangisi? Cevapları merak ediyorum! 👀',
        'Yeni bir teknoloji öğrenmek için en iyi zaman ne zaman? Şimdi! Başlayın!',
      ],
      question: [
        'Sizce önümüzdeki 5 yıl içinde en çok hangi teknoloji gelişecek?',
        'Remote çalışma mı, ofis çalışması mı? Tercihlerinizi merak ediyorum.',
        'Kod yazarken en çok hangi müziği dinliyorsunuz?',
      ],
      promotional: [
        'Yeni blog yazımı yayınladım! AI ile otomasyon konusunda deneyimlerimi paylaştım. Link bio\'da!',
        'Projelerinize yapay zeka entegre etmek ister misiniz? Size yardımcı olabilirim. DM\'den ulaşın!',
        'Ücretsiz webinar: "Modern Web Geliştirme Teknikleri" - Kaydolmak için link\'e tıklayın!',
      ],
    }

    const tweets = mockTweets[options.type] || mockTweets.engaging
    return tweets[Math.floor(Math.random() * tweets.length)]
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Tweet Oluştur"
        subtitle="AI destekli tweet oluşturucu"
      />

      <div className="p-6 max-w-3xl">
        <TweetComposer
          onPost={handlePost}
          onGenerate={handleGenerate}
        />
      </div>
    </div>
  )
}
