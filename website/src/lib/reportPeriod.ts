export type ReportPeriod = 'minggu' | 'bulan'

export function todayWib(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// DATE columns are calendar dates, not instants: do not convert them through local time.
export function reportRange(period: ReportPeriod, now = new Date()) {
  const end = todayWib(now)
  const date = new Date(`${end}T00:00:00Z`)
  if (period === 'minggu') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  else date.setUTCDate(1)
  return { start: date.toISOString().slice(0, 10), end }
}

export function inRange(date: string, range: { start: string; end: string }) {
  return date >= range.start && date <= range.end
}

export function setoranForReport<T extends { tanggal: string; status: string }>(
  rows: T[], range: { start: string; end: string },
) {
  const periodRows = rows.filter(row => inRange(row.tanggal, range))
  return {
    approved: periodRows.filter(row => row.status === 'disetujui'),
    pending: periodRows.filter(row => row.status === 'menunggu'),
  }
}

export function formatReportDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
}

export function cashSummary<T extends { tanggal: string; jenis: 'masuk' | 'keluar'; jumlah: number }>(
  transactions: T[], range: { start: string; end: string },
) {
  const signed = (row: T) => (row.jenis === 'masuk' ? 1 : -1) * Number(row.jumlah)
  const rows = transactions.filter(row => inRange(row.tanggal, range))
  const opening = transactions.filter(row => row.tanggal < range.start).reduce((sum, row) => sum + signed(row), 0)
  const income = rows.filter(row => row.jenis === 'masuk').reduce((sum, row) => sum + Number(row.jumlah), 0)
  const expense = rows.filter(row => row.jenis === 'keluar').reduce((sum, row) => sum + Number(row.jumlah), 0)
  return { rows, opening, income, expense, closing: opening + income - expense }
}
