interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Card({ children, className = '', title, subtitle, action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
