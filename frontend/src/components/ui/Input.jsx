export default function Input({ label, error, type = 'text', id, className = '', ...rest }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={[
          'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-300 focus:border-facil focus:ring-2 focus:ring-facil-100',
          className,
        ].join(' ')}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
