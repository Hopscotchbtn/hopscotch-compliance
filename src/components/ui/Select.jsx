export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-2">
          {label}
          {required && <span className="text-hop-marmalade-dark ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`
          w-full px-4 py-3 min-h-[44px]
          bg-white border-2 border-gray-200 rounded-lg
          text-hop-forest font-body text-base
          focus:outline-none focus:border-hop-forest focus:ring-2 focus:ring-hop-forest/20
          disabled:bg-gray-100 disabled:cursor-not-allowed
          appearance-none
          bg-no-repeat bg-right
          pr-10
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231f4435'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundSize: '24px',
          backgroundPosition: 'right 12px center',
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
