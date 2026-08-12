import AnimatedButton from './AnimatedButton'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterSelectConfig {
  key: string
  label?: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

interface SearchAndFilterBarProps {
  searchQuery: string
  searchPlaceholder?: string
  onSearchChange: (query: string) => void
  selectFilters?: FilterSelectConfig[]
  onClearFilters: () => void
  showClearButton: boolean
}

export default function SearchAndFilterBar({
  searchQuery,
  searchPlaceholder = 'Tìm kiếm...',
  onSearchChange,
  selectFilters = [],
  onClearFilters,
  showClearButton
}: SearchAndFilterBarProps) {
  return (
    <div className="filter-bar" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center', width: '100%' }}>
      <div className="search-field" style={{ flex: '1', minWidth: '240px' }}>
        <input
          type="text"
          className="form-input"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {selectFilters.map((filter) => (
        <div key={filter.key} className="select-field" style={{ minWidth: '150px' }}>
          <select
            className="form-input"
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {showClearButton && (
        <AnimatedButton type="button" variant="ghost" size="sm" onClick={onClearFilters} style={{ height: '42px' }}>
          Xóa bộ lọc
        </AnimatedButton>
      )}
    </div>
  )
}
