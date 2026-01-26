export function Checkbox({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-hop-forest focus:ring-hop-forest focus:ring-2 cursor-pointer"
      />
      <span className="text-hop-forest text-base">{label}</span>
    </label>
  )
}

export function CheckboxGroup({ label, options, selected = [], onChange }) {
  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-3">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <Checkbox
            key={option}
            label={option}
            checked={selected.includes(option)}
            onChange={() => handleToggle(option)}
          />
        ))}
      </div>
    </div>
  )
}

export function RadioGroup({ label, options, value, onChange, required = false }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-3">
          {label}
          {required && <span className="text-hop-marmalade-dark ml-1">*</span>}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id || option}
            className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-hop-forest/50 transition-colors"
            style={value === (option.id || option) ? { borderColor: '#1f4435', backgroundColor: '#f2eeed' } : {}}
          >
            <input
              type="radio"
              name={label}
              checked={value === (option.id || option)}
              onChange={() => onChange(option.id || option)}
              className="mt-1 w-5 h-5 text-hop-forest focus:ring-hop-forest"
            />
            <div>
              <span className="text-hop-forest font-medium">{option.label || option}</span>
              {option.description && (
                <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
