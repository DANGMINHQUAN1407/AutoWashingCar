import React from 'react'

interface VoucherCardProps {
  discountText: string
  discountTag: string
  title: string
  code: string
  isExpired?: boolean
  isUsed?: boolean
  conditions?: React.ReactNode[]
  footer?: React.ReactNode
  actionButton?: React.ReactNode
  className?: string
}

export default function VoucherCard({
  discountText,
  discountTag,
  title,
  code,
  isExpired = false,
  isUsed = false,
  conditions = [],
  footer,
  actionButton,
  className = '',
}: VoucherCardProps) {
  return (
    <div className={`ticket-card ${isExpired ? 'ticket-expired' : ''} ${isUsed ? 'ticket-used' : ''} ${className}`}>
      {/* Left Side: Badge / Discount */}
      <div className="ticket-left">
        <div className="ticket-discount">{discountText}</div>
        <div className="ticket-tag">{discountTag}</div>
        {/* Punch holes */}
        <div className="notch notch-top"></div>
        <div className="notch notch-bottom"></div>
      </div>

      {/* Dashed Separator */}
      <div className="ticket-divider"></div>

      {/* Right Side: Details */}
      <div className="ticket-right">
        <div className="ticket-header">
          <span className="ticket-title">{title}</span>
          <div className="ticket-code-wrapper">
            <code className="ticket-code">{code}</code>
            {actionButton}
          </div>
        </div>

        <div className="ticket-body">
          {conditions.map((cond, idx) => (
            <div key={idx} className="ticket-cond">
              {cond}
            </div>
          ))}
        </div>

        {footer && <div className="ticket-footer">{footer}</div>}
      </div>
    </div>
  )
}
