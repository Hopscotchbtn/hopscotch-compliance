import { forwardRef } from 'react'

export function Input({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  required = false,
  min,
  max,
  step,
  suffix,
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-2">
          {label}
          {required && <span className="text-hop-marmalade-dark ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className={`
            w-full px-4 py-3 min-h-[44px]
            bg-white border-2 border-gray-200 rounded-lg
            text-hop-forest font-body text-base
            focus:outline-none focus:border-hop-forest focus:ring-2 focus:ring-hop-forest/20
            disabled:bg-gray-100 disabled:cursor-not-allowed
            placeholder:text-gray-400
            ${suffix ? 'pr-12' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export const TextArea = forwardRef(function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 3,
  disabled = false,
  required = false,
}, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-2">
          {label}
          {required && <span className="text-hop-marmalade-dark ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`
          w-full px-4 py-3
          bg-white border-2 border-gray-200 rounded-lg
          text-hop-forest font-body text-base
          focus:outline-none focus:border-hop-forest focus:ring-2 focus:ring-hop-forest/20
          disabled:bg-gray-100 disabled:cursor-not-allowed
          placeholder:text-gray-400
          resize-none
        `}
      />
    </div>
  )
})
