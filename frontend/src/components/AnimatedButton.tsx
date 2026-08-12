import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'premium'

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  showArrow?: boolean
}

export default function AnimatedButton({
  variant = 'primary',
  size = 'md',
  children,
  showArrow = true,
  className = '',
  ...props
}: AnimatedButtonProps) {
  const sizeClass = size === 'sm' ? 'anim-btn--sm' : size === 'lg' ? 'anim-btn--lg' : ''

  return (
    <button
      {...props}
      className={`anim-btn anim-btn--${variant} ${sizeClass} ${className}`}
    >
      {showArrow && (
        <svg viewBox="0 0 24 24" className="anim-btn__arr anim-btn__arr--2" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>
      )}
      <span className="anim-btn__text">{children}</span>
      <span className="anim-btn__circle" />
      {showArrow && (
        <svg viewBox="0 0 24 24" className="anim-btn__arr anim-btn__arr--1" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>
      )}
    </button>
  )
}
