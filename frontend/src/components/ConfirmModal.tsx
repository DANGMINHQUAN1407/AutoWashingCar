import React from 'react'
import AnimatedButton from './AnimatedButton'

type ModalVariant = 'danger' | 'warning' | 'primary' | 'success'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  // Icon coloring logic based on variant
  const getIconStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--color-warning)',
          borderColor: 'rgba(245, 158, 11, 0.2)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)',
        }
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--color-success)',
          borderColor: 'rgba(16, 185, 129, 0.2)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
        }
      case 'primary':
        return {
          background: 'var(--color-primary-dim)',
          color: 'var(--color-primary)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
        }
      case 'danger':
      default:
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--color-danger)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
        }
    }
  }

  // Icon SVG based on variant
  const renderIcon = () => {
    switch (variant) {
      case 'warning':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      case 'success':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      case 'primary':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
      case 'danger':
      default:
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
    }
  }

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-card">
        <div className="confirm-modal-icon" style={getIconStyles()}>
          {renderIcon()}
        </div>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
          <div style={{ marginTop: '8px' }}>{message}</div>
        </div>
        <div className="confirm-modal-actions">
          <AnimatedButton
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            showArrow={false}
          >
            {cancelText}
          </AnimatedButton>
          <AnimatedButton
            type="button"
            variant={variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
            showArrow={false}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AnimatedButton>
        </div>
      </div>
    </div>
  )
}
