import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'premium'

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  showArrow?: boolean
}

/**
 * BMW M-style button: flat, rectangular, UPPERCASE letterspaced labels.
 * Arrow is a simple → chevron appended after the label text.
 */
export default function AnimatedButton({
  variant = 'primary',
  size = 'md',
  children,
  showArrow = true,
  className = '',
  ...props
}: AnimatedButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''
  
  // Map variant names to btn classes
  const variantMap: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
    premium: 'btn-primary', // premium maps to primary in BMW M
  }

  return (
    <button
      {...props}
      className={`btn ${variantMap[variant]} ${sizeClass} ${className}`}
    >
      <span>{children}</span>
      {showArrow && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: '4px' }}
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )}
    </button>
  )
}
