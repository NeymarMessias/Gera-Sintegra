const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
  },
  yellow: {
    bg: 'bg-yellow-100',
    icon: 'text-yellow-600',
  },
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
  },
}

export default function StatCard({ icon: Icon, value, label, color = 'blue' }) {
  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-center gap-4">
      <div className={['p-3 rounded-full flex-shrink-0', colors.bg].join(' ')}>
        <Icon className={['h-6 w-6', colors.icon].join(' ')} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}
