import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  charCount?: number
  maxChars?: number
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, charCount, maxChars, className = '', ...props }, ref) => {
    const isOverLimit = maxChars && charCount && charCount > maxChars

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
              error || isOverLimit
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            } ${className}`}
            {...props}
          />
          {maxChars && (
            <div className={`absolute bottom-2 right-2 text-xs ${
              isOverLimit ? 'text-red-600' : 'text-gray-400'
            }`}>
              {charCount || 0}/{maxChars}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export default TextArea
