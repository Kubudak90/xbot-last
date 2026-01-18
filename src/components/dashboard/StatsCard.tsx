interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

export default function StatsCard({ title, value, change, icon, color = 'blue' }: StatsCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-400">bu hafta</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
