import { csvNesneler, sayiyaCevir } from '../lib/csv'
import { koddanNo } from '../lib/format'
import type { SiparisKalemi } from '../types'
import type { SiparisGirdi } from './siparis'
import { siparisOlustur } from './siparis'
import { getDocs, query, where } from 'firebase/firestore'
import { siparisYolu } from './yollar'

/**
 * Shopier panelinden indirilen sipariş dökümünü içe aktarır.
 * Webhook çalışmadığında (veya geçmiş siparişler için) yedek yol budur.
 *
 * Sütun adları Shopier'in dışa aktarımına göre değişebildiği için başlıklar
 * esnek eşleştirilir; en azından sipariş numarası ve ürün adı/kodu gerekir.
 */

const ALAN_ADLARI = {
  siparisId: ['siparisno', 'siparişno', 'orderid', 'siparisid', 'siparişid', 'id'],
  musteriAd: ['aliciadi', 'alıcıadı', 'musteri', 'müşteri', 'ad', 'adsoyad', 'customername', 'isim'],
  telefon: ['telefon', 'gsm', 'cep', 'phone', 'tel'],
  adres: ['adres', 'teslimatadresi', 'address'],
  urun: ['urun', 'ürün', 'urunadi', 'ürünadı', 'productname', 'urunkodu', 'ürünkodu', 'stokkodu'],
  adet: ['adet', 'miktar', 'quantity'],
  tutar: ['tutar', 'toplam', 'fiyat', 'odenentutar', 'ödenentutar', 'total', 'price'],
  tarih: ['tarih', 'siparistarihi', 'sipariştarihi', 'date', 'orderdate'],
  not: ['not', 'aciklama', 'açıklama', 'note'],
}

function alanBul(satir: Record<string, string>, adaylar: string[]): string {
  for (const anahtar of Object.keys(satir)) {
    const k = anahtar.toLocaleLowerCase('tr-TR').replace(/[\s_\-().]/g, '')
    if (adaylar.includes(k)) return satir[anahtar] ?? ''
  }
  return ''
}

/** "12.09.2026" / "2026-09-12" / "12.09.2026 14:30" → Date */
function tarihCoz(metin: string): Date {
  const temiz = (metin || '').trim()
  if (!temiz) return new Date()
  const nokta = temiz.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (nokta) return new Date(Number(nokta[3]), Number(nokta[2]) - 1, Number(nokta[1]))
  const iso = Date.parse(temiz)
  return Number.isFinite(iso) ? new Date(iso) : new Date()
}

export interface ShopierIceAktarmaSonucu {
  eklenen: number
  atlanan: number
  mevcut: number
  hatalar: string[]
}

export async function shopierCsvIceAktar(
  uid: string,
  csvMetni: string,
  varsayilanFiyat: number,
  stokDus: boolean,
): Promise<ShopierIceAktarmaSonucu> {
  const { satirlar } = csvNesneler(csvMetni)
  const sonuc: ShopierIceAktarmaSonucu = { eklenen: 0, atlanan: 0, mevcut: 0, hatalar: [] }

  if (satirlar.length === 0) {
    sonuc.hatalar.push('Dosyada okunabilir satır bulunamadı.')
    return sonuc
  }

  // Aynı sipariş numarası birden fazla satırda (her ürün bir satır) gelebilir: grupla.
  const gruplar = new Map<string, Record<string, string>[]>()
  satirlar.forEach((satir, i) => {
    const id = alanBul(satir, ALAN_ADLARI.siparisId).trim() || `satir-${i + 2}`
    const mevcut = gruplar.get(id) ?? []
    mevcut.push(satir)
    gruplar.set(id, mevcut)
  })

  for (const [shopierId, grup] of gruplar) {
    try {
      // Idempotent: aynı Shopier sipariş kimliği ikinci kez yazılmaz.
      const varMi = await getDocs(
        query(siparisYolu(uid), where('shopierSiparisId', '==', shopierId)),
      )
      if (!varMi.empty) {
        sonuc.mevcut++
        continue
      }

      const ilk = grup[0]
      const urunler: SiparisKalemi[] = []

      for (const satir of grup) {
        const urunMetni = alanBul(satir, ALAN_ADLARI.urun)
        const no = koddanNo(urunMetni)
        if (!no) continue
        const adet = Math.max(1, Math.trunc(sayiyaCevir(alanBul(satir, ALAN_ADLARI.adet))) || 1)
        const tutar = sayiyaCevir(alanBul(satir, ALAN_ADLARI.tutar))
        urunler.push({
          parfumNo: no,
          kod: urunMetni.trim(),
          adet,
          birimFiyat: tutar > 0 ? tutar / adet : varsayilanFiyat,
        })
      }

      if (urunler.length === 0) {
        sonuc.atlanan++
        if (sonuc.hatalar.length < 10) {
          sonuc.hatalar.push(`${shopierId}: ürün kodundan parfüm numarası çözülemedi.`)
        }
        continue
      }

      const girdi: SiparisGirdi = {
        kaynak: 'Shopier',
        shopierSiparisId: shopierId,
        musteri: {
          ad: alanBul(ilk, ALAN_ADLARI.musteriAd),
          telefon: alanBul(ilk, ALAN_ADLARI.telefon),
          adres: alanBul(ilk, ALAN_ADLARI.adres),
          not: '',
        },
        urunler,
        // Shopier ödemesi peşin alınır: kayıt doğrudan ödenmiş sayılır.
        durum: 'Ödendi',
        siparisTarihi: tarihCoz(alanBul(ilk, ALAN_ADLARI.tarih)),
        odemeYontemi: 'Shopier',
        notlar: alanBul(ilk, ALAN_ADLARI.not),
      }

      await siparisOlustur(uid, girdi, stokDus)
      sonuc.eklenen++
    } catch (e) {
      sonuc.atlanan++
      if (sonuc.hatalar.length < 10) {
        sonuc.hatalar.push(`${shopierId}: ${(e as Error)?.message ?? 'yazılamadı'}`)
      }
    }
  }

  return sonuc
}
