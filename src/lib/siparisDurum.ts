import type { Siparis, SiparisDurumu } from '../types'
import { gunFarki, tarihe } from './date'
import { aramaMetni } from './format'

export type RozetRengi = 'notr' | 'mavi' | 'yesil' | 'sari' | 'kirmizi' | 'mor'

export const DURUM_RENKLERI: Record<SiparisDurumu, RozetRengi> = {
  Yeni: 'mavi',
  Hazırlanıyor: 'sari',
  Kargolandı: 'mor',
  'Teslim Edildi': 'notr',
  Ödendi: 'yesil',
  İptal: 'kirmizi',
}

/**
 * Ödeme kaç gündür bekliyor?
 * Kargolandıysa kargo tarihinden, değilse sipariş tarihinden sayılır.
 * Arşivlenmiş, iptal edilmiş veya ödemesi alınmış siparişler için null döner.
 */
export function odemeBeklemeGunu(siparis: Siparis, simdi = new Date()): number | null {
  if (siparis.arsiv || siparis.durum === 'İptal' || siparis.odemeTarihi) return null
  const baslangic = tarihe(siparis.kargoTarihi) ?? tarihe(siparis.siparisTarihi)
  if (!baslangic) return null
  return gunFarki(baslangic, simdi)
}

export function siparisAra(siparisler: Siparis[], sorgu: string): Siparis[] {
  const q = aramaMetni(sorgu)
  if (!q) return siparisler
  const rakamlar = q.replace(/\D/g, '')
  return siparisler.filter((s) => {
    const telefonEslesti =
      rakamlar.length >= 3 && s.musteri.telefon.replace(/\D/g, '').includes(rakamlar)
    return (
      telefonEslesti ||
      aramaMetni(s.siparisNo).includes(q) ||
      aramaMetni(s.musteri.ad).includes(q) ||
      aramaMetni(s.musteri.adres).includes(q) ||
      aramaMetni(s.notlar).includes(q) ||
      s.urunler.some((u) => String(u.parfumNo) === q || aramaMetni(u.kod).includes(q))
    )
  })
}
