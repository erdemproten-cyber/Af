import { telefonNormalize, para, tarih } from './format'
import { tarihe } from './date'
import type { Siparis } from '../types'
import { kargoTakipLinki } from './kargo'

/** wa.me bağlantısı — hazır metinle WhatsApp açar. */
export function whatsappLinki(telefon: string, mesaj: string): string | null {
  const no = telefonNormalize(telefon)
  if (!no) return null
  return `https://wa.me/${no}?text=${encodeURIComponent(mesaj)}`
}

export function kargoMesaji(siparis: Siparis): string {
  const ad = siparis.musteri.ad?.split(' ')[0] || 'Merhaba'
  const satirlar = [`Merhaba ${ad},`, '']
  satirlar.push(`${siparis.siparisNo} numaralı siparişiniz kargoya verildi. 🎁`)
  if (siparis.kargoFirmasi) satirlar.push(`Kargo firması: ${siparis.kargoFirmasi}`)
  if (siparis.kargoTakipNo) satirlar.push(`Takip no: ${siparis.kargoTakipNo}`)
  const link = kargoTakipLinki(siparis.kargoFirmasi, siparis.kargoTakipNo)
  if (link) satirlar.push(link)
  satirlar.push('', 'Keyifli kullanımlar dileriz!')
  return satirlar.join('\n')
}

export function siparisOzetMesaji(siparis: Siparis): string {
  const ad = siparis.musteri.ad?.split(' ')[0] || 'Merhaba'
  const urunler = siparis.urunler
    .map((u) => `• ${u.kod} (No ${u.parfumNo}) × ${u.adet} — ${para(u.adet * u.birimFiyat)}`)
    .join('\n')
  return [
    `Merhaba ${ad},`,
    '',
    `${siparis.siparisNo} numaralı siparişinizi aldık:`,
    urunler,
    '',
    `Toplam: ${para(siparis.toplamTutar)}`,
    'Teşekkür ederiz!',
  ].join('\n')
}

export function odemeHatirlatmaMesaji(siparis: Siparis): string {
  const ad = siparis.musteri.ad?.split(' ')[0] || 'Merhaba'
  const kargo = tarihe(siparis.kargoTarihi)
  return [
    `Merhaba ${ad},`,
    '',
    `${siparis.siparisNo} numaralı siparişinizin ödemesi henüz tarafımıza ulaşmadı.`,
    kargo ? `Kargoya veriliş tarihi: ${tarih(kargo)}` : '',
    `Tutar: ${para(siparis.toplamTutar)}`,
    '',
    'Bilginize, iyi günler dileriz.',
  ]
    .filter(Boolean)
    .join('\n')
}
