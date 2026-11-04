// Calendar boundaries are calculated in WIB, independent of server timezone.
function periods(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = type => parts.find(p => p.type === type).value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const date = new Date(`${today}T00:00:00Z`)
  const shift = days => new Date(date.getTime() + days * 86400000).toISOString().slice(0, 10)
  const weekday = (date.getUTCDay() + 6) % 7
  return { today, monthStart: `${today.slice(0, 7)}-01`, weekStart: shift(-weekday), previousStart: shift(-weekday - 7), previousEnd: shift(-7) }
}
function comparison(current, previous) {
  if (previous === 0) return current === 0 ? 'Belum ada setoran disetujui pada kedua periode.' : 'Periode pembanding belum memiliki setoran disetujui; persentase perubahan belum tersedia.'
  const change = (current - previous) / previous * 100
  return change === 0 ? 'Berat sampah sama dengan periode pembanding.' : `Berat sampah ${change > 0 ? 'naik' : 'turun'} ${Math.abs(change).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% dibanding periode pembanding.`
}
module.exports = { periods, comparison }
