const { explain } = require('../utils/assistantAI')
const { pool } = require('../config/db')
const { periods, comparison } = require('../utils/assistantPeriod')
const number = value => Number(value || 0)
const fmt = value => number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })
function validId(value) { return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) }
function createController(db = pool, clock = () => new Date(), explainResult = explain) {
  return {
    async options(req, res, next) {
      try {
        const [asrama] = await db.query('SELECT id, nama FROM asrama ORDER BY nama')
        const [sampah] = await db.query('SELECT id, jenis, kategori FROM tarif_sampah ORDER BY kategori, jenis')
        res.set('Cache-Control', 'no-store').json({ asrama, sampah })
      } catch (err) { next(err) }
    },
    async answer(req, res, next) {
      try {
        const { topic, id } = req.query
        if (!['poin', 'sampah', 'mingguan'].includes(topic)) return res.status(400).json({ message: 'Pilih pertanyaan yang tersedia.' })
        if (topic !== 'mingguan' && !validId(id)) return res.status(400).json({ message: 'Pilihan mabna atau jenis sampah tidak valid.' })
        const now = clock()
        const p = periods(now)
        const result = { topic, mode: 'data', generatedAt: now.toISOString(), title: '', period: '', summary: '', metrics: [], details: [], note: '' }
        if (topic === 'poin') {
          const [[asrama]] = await db.query('SELECT id, nama FROM asrama WHERE id = ?', [id])
          if (!asrama) return res.status(404).json({ message: 'Mabna tidak ditemukan. Muat ulang pilihan.' })
          const [rows] = await db.query('SELECT nama, poin FROM kamar WHERE asrama_id = ? ORDER BY nama', [id])
          const total = rows.reduce((sum, row) => sum + number(row.poin), 0)
          Object.assign(result, { title: `Saldo poin ${asrama.nama}`, period: `Saldo saat ini · ${p.today} (WIB)`, summary: `${asrama.nama} memiliki saldo ${fmt(total)} poin dari ${rows.length} kamar.`, metrics: [{ label: 'Saldo tersedia', value: `${fmt(total)} poin` }, { label: 'Jumlah kamar', value: String(rows.length) }], details: rows.map(row => ({ label: row.nama, value: `${fmt(row.poin)} poin` })), note: rows.length ? 'Saldo sudah memperhitungkan poin yang ditukar.' : 'Belum ada kamar terdaftar di mabna ini.' })
        } else if (topic === 'sampah') {
          const [[tarif]] = await db.query('SELECT jenis, kategori FROM tarif_sampah WHERE id = ?', [id])
          if (!tarif) return res.status(404).json({ message: 'Jenis sampah tidak ditemukan. Muat ulang pilihan.' })
          const [[row]] = await db.query("SELECT COALESCE(SUM(berat_kg), 0) AS berat, COUNT(*) AS jumlah FROM setoran WHERE status = 'disetujui' AND tarif_sampah_id = ? AND tanggal BETWEEN ? AND ?", [id, p.monthStart, p.today])
          Object.assign(result, { title: `${tarif.jenis} bulan ini`, period: `${p.monthStart} – ${p.today} (WIB)`, summary: `Total ${tarif.jenis} yang disetujui bulan ini adalah ${fmt(row.berat)} kg dari ${fmt(row.jumlah)} setoran.`, metrics: [{ label: 'Berat disetujui', value: `${fmt(row.berat)} kg` }, { label: 'Jumlah setoran', value: fmt(row.jumlah) }], details: [{ label: 'Kategori', value: tarif.kategori }], note: 'Dihitung sejak tanggal 1 sampai hari ini. Setoran menunggu dan ditolak tidak termasuk.' })
        } else {
          const aggregate = async (start, end) => {
            const [[row]] = await db.query("SELECT COALESCE(SUM(berat_kg), 0) AS berat, COUNT(*) AS jumlah, COUNT(DISTINCT kamar_id) AS kamar FROM setoran WHERE status = 'disetujui' AND tanggal BETWEEN ? AND ?", [start, end])
            return { berat: number(row.berat), jumlah: number(row.jumlah), kamar: number(row.kamar) }
          }
          const current = await aggregate(p.weekStart, p.today)
          const previous = await aggregate(p.previousStart, p.previousEnd)
          Object.assign(result, { title: 'Perkembangan pengelolaan sampah minggu ini', period: `${p.weekStart} – ${p.today} (WIB)`, summary: `Tercatat ${fmt(current.berat)} kg sampah dari ${fmt(current.jumlah)} setoran disetujui, melibatkan ${fmt(current.kamar)} kamar. ${comparison(current.berat, previous.berat)}`, metrics: [{ label: 'Berat minggu ini', value: `${fmt(current.berat)} kg` }, { label: 'Setoran disetujui', value: fmt(current.jumlah) }, { label: 'Kamar berpartisipasi', value: fmt(current.kamar) }], details: [{ label: 'Berat periode pembanding', value: `${fmt(previous.berat)} kg` }, { label: 'Setoran periode pembanding', value: fmt(previous.jumlah) }, { label: 'Kamar periode pembanding', value: fmt(previous.kamar) }], note: `Pembanding: ${p.previousStart} – ${p.previousEnd} (WIB), dengan jumlah hari kalender yang sama. Hari ini masih berjalan. Nilai nol berarti tidak ada setoran disetujui yang tercatat, bukan bukti tidak ada aktivitas pengelolaan sampah.` })
        }
        Object.assign(result, await explainResult(result))
        res.set('Cache-Control', 'no-store').json(result)
      } catch (err) { next(err) }
    }
  }
}
module.exports = { ...createController(), createController }
