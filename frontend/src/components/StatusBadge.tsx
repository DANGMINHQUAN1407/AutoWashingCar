import React from 'react'

export type BadgeType = 'success' | 'warning' | 'danger' | 'primary' | 'secondary'

interface StatusBadgeProps {
  type: BadgeType
  label: string
  className?: string
  style?: React.CSSProperties
}

export default function StatusBadge({ type, label, className = '', style }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${type} ${className}`} style={style}>
      {label}
    </span>
  )
}
