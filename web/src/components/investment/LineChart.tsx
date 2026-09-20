interface LineChartProps {
  data: Array<{ date: string; value: number }>
  width?: number
  height?: number
  color?: string
}

export function LineChart({
  data,
  width = 800,
  height = 400,
  color = '#10b981',
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-gray-500">No data to display</p>
      </div>
    )
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1 // avoid division by zero

  // Normalize data to SVG coordinates
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth
      const y = chartHeight - ((d.value - min) / range) * chartHeight
      return `${x},${y}`
    })
    .join(' ')

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Y-axis labels */}
        <text
          x={-10}
          y={0}
          textAnchor="end"
          fontSize="12"
          fill="#6b7280"
          dominantBaseline="middle"
        >
          {formatCurrency(max)}
        </text>
        <text
          x={-10}
          y={chartHeight}
          textAnchor="end"
          fontSize="12"
          fill="#6b7280"
          dominantBaseline="middle"
        >
          {formatCurrency(min)}
        </text>

        {/* X-axis labels */}
        <text
          x={0}
          y={chartHeight + 25}
          textAnchor="start"
          fontSize="12"
          fill="#6b7280"
        >
          {data[0].date}
        </text>
        {data.length > 2 && (
          <text
            x={chartWidth / 2}
            y={chartHeight + 25}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {data[Math.floor(data.length / 2)].date}
          </text>
        )}
        <text
          x={chartWidth}
          y={chartHeight + 25}
          textAnchor="end"
          fontSize="12"
          fill="#6b7280"
        >
          {data[data.length - 1].date}
        </text>

        {/* Grid lines */}
        <line
          x1={0}
          y1={0}
          x2={chartWidth}
          y2={0}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {/* Line chart */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * chartWidth
          const y = chartHeight - ((d.value - min) / range) * chartHeight
          return (
            <circle key={i} cx={x} cy={y} r={3} fill={color} />
          )
        })}
      </g>
    </svg>
  )
}
