/** Türkçe biçimlendirme yardımcıları. */

const paraBicimi = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const sayiBicimi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

/** 2500 → "₺2.500" */
export function para(tutar: number | null | undefined): string {
  return paraBicimi.format(Number(tutar) || 0)
}

/** 1234.5 → "1.234,5" */
export function sayi(deger: number | null | undefined): string {
  return sayiBicimi.format(Number(deger) || 0)
}

/** Date → "12.09.2026" */
export function tarih(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Date → "12.09.2026 14:30" */
export function tarihSaat(d: Date | null | undefined): string {
  if (!d) return '—'
  return `${tarih(d)} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
}

/** `<input type="date">` için "2026-09-12" */
export function girdiTarihi(d: Date): string {
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${ay}-${gun}`
}

/** "2026-09-12" → yerel saat diliminde gün başlangıcı. */
export function girdidenTarih(deger: string): Date {
  const [yil, ay, gun] = deger.split('-').map(Number)
  return new Date(yil, (ay || 1) - 1, gun || 1)
}

/** "0532 111 22 33" → "905321112233" (WhatsApp / tel bağlantıları için) */
export function telefonNormalize(telefon: string): string {
  const rakamlar = (telefon || '').replace(/\D/g, '')
  if (!rakamlar) return ''
  if (rakamlar.startsWith('90')) return rakamlar
  if (rakamlar.startsWith('0')) return `90${rakamlar.slice(1)}`
  if (rakamlar.length === 10) return `90${rakamlar}`
  return rakamlar
}

/** "905321112233" → "0532 111 22 33" */
export function telefonGoster(telefon: string): string {
  const n = telefonNormalize(telefon)
  if (n.length !== 12) return telefon || '—'
  const y = n.slice(2)
  return `0${y.slice(0, 3)} ${y.slice(3, 6)} ${y.slice(6, 8)} ${y.slice(8, 10)}`
}

/**
 * Aramada kullanılmak üzere metni normalleştirir.
 * Türkçe küçültme "I" → "ı" verdiği için noktasız ı'yı i'ye eşitler;
 * bazı girdilerde kalan birleşik nokta (U+0307) temizlenir.
 * Böylece "ISIM", "İsim" ve "isim" aynı sonucu döndürür.
 */
export function aramaMetni(deger: string | number | null | undefined): string {
  return String(deger ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .replace(/\u0307/g, '')
    .trim()
}

/** 12 → "AF-012" */
export function urunKodu(no: number, onEk = 'AF'): string {
  return `${onEk}-${String(no).padStart(3, '0')}`
}

/** "AF-012" / "af12" / "12" → 12 */
export function koddanNo(kod: string): number | null {
  const eslesme = String(kod || '').match(/(\d+)\s*$/)
  if (!eslesme) return null
  const no = Number(eslesme[1])
  return Number.isFinite(no) && no > 0 ? no : null
}

/** 1 → "1 gün", 0 → "bugün" */
export function gunMetni(gun: number): string {
  if (gun <= 0) return 'bugün'
  return `${gun} gün`
}
