/**
 * Bağımlılıksız CSV okuma/yazma.
 * - Ayraç otomatik algılanır (`,` veya `;` — Türkçe Excel `;` kullanır).
 * - Tırnaklı alanlar, alan içi ayraç/satır sonu ve `""` kaçışı desteklenir.
 */

export type CsvSatir = Record<string, string>

export function ayraciAlgila(metin: string): ',' | ';' | '\t' {
  const ilkSatir = metin.split(/\r?\n/, 1)[0] ?? ''
  const say = (k: string) => ilkSatir.split(k).length - 1
  const adaylar: Array<[',' | ';' | '\t', number]> = [
    [';', say(';')],
    [',', say(',')],
    ['\t', say('\t')],
  ]
  adaylar.sort((a, b) => b[1] - a[1])
  return adaylar[0][1] > 0 ? adaylar[0][0] : ','
}

/** CSV metnini hücre dizisine böler. */
export function csvCoz(metin: string, ayrac?: string): string[][] {
  const temiz = metin.replace(/^﻿/, '')
  const a = ayrac ?? ayraciAlgila(temiz)
  const satirlar: string[][] = []
  let satir: string[] = []
  let alan = ''
  let tirnakta = false

  for (let i = 0; i < temiz.length; i++) {
    const k = temiz[i]

    if (tirnakta) {
      if (k === '"') {
        if (temiz[i + 1] === '"') {
          alan += '"'
          i++
        } else {
          tirnakta = false
        }
      } else {
        alan += k
      }
      continue
    }

    if (k === '"') {
      tirnakta = true
    } else if (k === a) {
      satir.push(alan)
      alan = ''
    } else if (k === '\n') {
      satir.push(alan)
      satirlar.push(satir)
      satir = []
      alan = ''
    } else if (k === '\r') {
      // \r\n içindeki \r yok sayılır
    } else {
      alan += k
    }
  }

  if (alan !== '' || satir.length > 0) {
    satir.push(alan)
    satirlar.push(satir)
  }

  return satirlar.filter((s) => s.some((h) => h.trim() !== ''))
}

/** İlk satırı başlık kabul ederek nesne dizisi döndürür. */
export function csvNesneler(metin: string): { basliklar: string[]; satirlar: CsvSatir[] } {
  const hucreler = csvCoz(metin)
  if (hucreler.length === 0) return { basliklar: [], satirlar: [] }
  const basliklar = hucreler[0].map((b) => b.trim())
  const satirlar = hucreler.slice(1).map((s) => {
    const nesne: CsvSatir = {}
    basliklar.forEach((baslik, i) => {
      nesne[baslik] = (s[i] ?? '').trim()
    })
    return nesne
  })
  return { basliklar, satirlar }
}

function hucreKacir(deger: unknown, ayrac: string): string {
  const metin = deger === null || deger === undefined ? '' : String(deger)
  if (metin.includes('"') || metin.includes('\n') || metin.includes('\r') || metin.includes(ayrac)) {
    return `"${metin.replace(/"/g, '""')}"`
  }
  return metin
}

/** Nesne dizisinden CSV metni üretir (Excel uyumlu: `;` ayracı + BOM). */
export function csvYaz(
  basliklar: string[],
  satirlar: Array<Array<string | number | null | undefined>>,
  ayrac = ';',
): string {
  const govde = [basliklar, ...satirlar]
    .map((s) => s.map((h) => hucreKacir(h, ayrac)).join(ayrac))
    .join('\r\n')
  return `﻿${govde}\r\n`
}

/** Tarayıcıda dosya indirir. */
export function dosyaIndir(adi: string, icerik: string, tur = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([icerik], { type: tur })
  const url = URL.createObjectURL(blob)
  const bag = document.createElement('a')
  bag.href = url
  bag.download = adi
  document.body.appendChild(bag)
  bag.click()
  document.body.removeChild(bag)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "2.500,00" / "2500.5" / "₺2 500" → 2500.5 */
export function sayiyaCevir(deger: string | number | null | undefined): number {
  if (typeof deger === 'number') return Number.isFinite(deger) ? deger : 0
  let metin = String(deger ?? '').replace(/[^\d,.-]/g, '').trim()
  if (!metin) return 0
  const sonVirgul = metin.lastIndexOf(',')
  const sonNokta = metin.lastIndexOf('.')
  if (sonVirgul > -1 && sonVirgul > sonNokta) {
    // Türkçe biçim: 2.500,75
    metin = metin.replace(/\./g, '').replace(',', '.')
  } else {
    // İngilizce biçim: 2,500.75
    metin = metin.replace(/,/g, '')
  }
  const sonuc = Number(metin)
  return Number.isFinite(sonuc) ? sonuc : 0
}
