const { routeQuestion } = require('../utils/assistantQuestion')
const { explain } = require('../utils/assistantAI')
const { pool } = require('../config/db')
const { periods, comparison } = require('../utils/assistantPeriod')
const number = value => Number(value || 0)
const fmt = value => number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })
function createController(db = pool, clock = () => new Date(), explainResult = explain, resolveQuestion = routeQuestion) {
  const controller = {
    async question(req, res, next) {
      res.set('Cache-Control', 'no-store')
      const question = req.body?.question
      if (typeof question !== 'string' || !question.trim() || question.length > 500) return res.status(400).json({ message: 'Tulis pertanyaan antara 1–500 karakter.' })
      let topic
      try { topic = await resolveQuestion(question) }
      catch (err) { return res.status(503).json({ message: err.message }) }
      if (!['poin', 'sampah', 'mingguan'].includes(topic)) return res.status(422).json({ message: 'Pertanyaan ini belum didukung. Tanyakan saldo semua mabna saat ini, total semua jenis sampah bulan ini, atau perkembangan minggu ini. Periode lain dan penyaringan tertentu belum tersedia.' })
      return controller.answer({ query: { topic } }, res, next)
    },
    async options(req, res, next) {
      try {
        const [asrama] = await db.query('SELECT id, nama FROM asrama ORDER BY nama')
        const [sampah] = await db.query('SELECT id, jenis, kategori FROM tarif_sampah ORDER BY kategori, jenis')
        res.set('Cache-Control', 'no-store').json({ asrama, sampah })
      } catch (err) { next(err) }
    },
    async answer(req, res, next) {
      try {
        const { topic } = req.query
        if (!['poin', 'sampah', 'mingguan'].includes(topic)) return res.status(400).json({ message: 'Pilih pertanyaan yang tersedia.' })
        const now = clock()
        const p = periods(now)
        const result = { topic, mode: 'data', generatedAt: now.toISOString(), title: '', period: '', summary: '', metrics: [], details: [], note: '' }
        if (topic === 'poin') {
          const [rows] = await db.query(`SELECT a.id, a.nama, COALESCE(SUM(k.poin), 0) AS poin, COUNT(k.id) AS kamar
            FROM asrama AS a LEFT JOIN kamar AS k ON k.asrama_id = a.id
            GROUP BY a.id, a.nama ORDER BY a.nama, a.id`)
          const total = rows.reduce((sum, row) => sum + number(row.poin), 0)
          const kamar = rows.reduce((sum, row) => sum + number(row.kamar), 0)
          const details = rows.map(row => ({ label: row.nama, value: `${fmt(row.poin)} poin · ${fmt(row.kamar)} kamar` }))
          Object.assign(result, {
            title: 'Saldo poin semua mabna', period: `Saldo saat ini · ${p.today} (WIB)`,
            summary: `Total saldo ${fmt(total)} poin dari ${fmt(rows.length)} mabna dan ${fmt(kamar)} kamar.`,
            metrics: [{ label: 'Total saldo tersedia', value: `${fmt(total)} poin` }, { label: 'Jumlah mabna', value: fmt(rows.length) }, { label: 'Jumlah kamar', value: fmt(kamar) }],
            details, breakdown: details,
            note: rows.length ? 'Saldo sudah memperhitungkan poin yang ditukar. Mabna tanpa kamar tetap ditampilkan dengan saldo nol.' : 'Belum ada mabna terdaftar.'
          })
        } else if (topic === 'sampah') {
          const [rows] = await db.query(`SELECT t.id, t.jenis, t.kategori, COALESCE(SUM(s.berat_kg), 0) AS berat, COUNT(s.id) AS jumlah
            FROM tarif_sampah AS t LEFT JOIN setoran AS s ON s.tarif_sampah_id = t.id
              AND s.status = 'disetujui' AND s.tanggal BETWEEN ? AND ?
            GROUP BY t.id, t.jenis, t.kategori ORDER BY t.kategori, t.jenis, t.id`, [p.monthStart, p.today])
          const berat = rows.reduce((sum, row) => sum + number(row.berat), 0)
          const jumlah = rows.reduce((sum, row) => sum + number(row.jumlah), 0)
          const details = rows.map(row => ({ label: `${row.jenis} · ${row.kategori}`, value: `${fmt(row.berat)} kg · ${fmt(row.jumlah)} setoran` }))
          Object.assign(result, {
            title: 'Semua jenis sampah bulan ini', period: `${p.monthStart} – ${p.today} (WIB)`,
            summary: `Total sampah disetujui bulan ini adalah ${fmt(berat)} kg dari ${fmt(jumlah)} setoran. Rincian mencakup seluruh ${fmt(rows.length)} jenis sampah terdaftar.`,
            metrics: [{ label: 'Berat disetujui', value: `${fmt(berat)} kg` }, { label: 'Jumlah setoran', value: fmt(jumlah) }, { label: 'Jenis sampah', value: fmt(rows.length) }],
            details, breakdown: details,
            note: rows.length ? 'Dihitung sejak tanggal 1 sampai hari ini (WIB). Setoran menunggu dan ditolak tidak termasuk. Jenis tanpa setoran disetujui tetap ditampilkan dengan nilai nol.' : 'Belum ada jenis sampah terdaftar di Kategori Sampah.'
          })
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
  return controller
}
module.exports = { ...createController(), createController }
