export default function Card({ children, className = '', title }) {
  return (
    <div className={['bg-white shadow-sm rounded-lg border border-gray-200', className].join(' ')}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}
