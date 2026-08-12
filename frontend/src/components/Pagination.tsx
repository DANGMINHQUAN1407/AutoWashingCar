import AnimatedButton from './AnimatedButton'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount?: number
  itemName?: string // ví dụ: "xe", "voucher", "giao dịch"
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  itemName = 'mục',
  onPageChange
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="pagination-bar" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', marginTop: '20px', marginBottom: '20px' }}>
      <AnimatedButton
        type="button"
        variant="ghost"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ← Trước
      </AnimatedButton>
      
      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        Trang {currentPage} / {totalPages} {totalCount !== undefined && `(Tổng: ${totalCount} ${itemName})`}
      </span>

      <AnimatedButton
        type="button"
        variant="ghost"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sau →
      </AnimatedButton>
    </div>
  )
}
