export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function formatTanggal(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export function formatTanggalPendek(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}
