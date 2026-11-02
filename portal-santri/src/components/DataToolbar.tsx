import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import './DataToolbar.css'

interface Props {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string
  filter: string
  onFilterChange: (value: string) => void
  filterLabel: string
  options: { value: string; label: string }[]
  count: number
  total: number
  status?: string
  children?: ReactNode
}

export function matchesSearch(query: string, ...values: unknown[]) {
  const text = values.map(value => String(value ?? '')).join(' ').toLocaleLowerCase('id')
  return query.trim().toLocaleLowerCase('id').split(/\s+/).every(word => text.includes(word))
}

export default function DataToolbar(props: Props) {
  return <div className="data-tools no-print">
    <div className="data-tools-row">
      <label className="data-tools-search">
        <Search size={17} aria-hidden="true" />
        <input type="search" autoComplete="off" aria-label={props.placeholder} placeholder={props.placeholder} value={props.query} onChange={event => props.onQueryChange(event.target.value)} />
      </label>
      <label className="data-tools-filter">
        <span className="sr-only">{props.filterLabel}</span>
        <select value={props.filter} onChange={event => props.onFilterChange(event.target.value)}>
          {props.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {props.children && <div className="data-tools-actions">{props.children}</div>}
    </div>
    <div className="data-tools-meta">
      <span role="status">{props.status || `${props.count} dari ${props.total} data ditampilkan`}</span>
      {(props.query || props.filter !== props.options[0]?.value) && <button type="button" onClick={() => { props.onQueryChange(''); props.onFilterChange(props.options[0]?.value || '') }}><X size={13} />Reset filter</button>}
    </div>
  </div>
}
