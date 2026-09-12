import type { Timestamp } from 'firebase/firestore'

export type Cinsiyet = 'Kadın' | 'Erkek' | 'Unisex'

export const CINSIYETLER: Cinsiyet[] = ['Kadın', 'Erkek', 'Unisex']

export interface KatalogUrun {
  id: string
  no: number
  kod: string
  cinsiyet: Cinsiyet
  aciklama: string
  varsayilanFiyat: number
  aktif: boolean
}

export interface Esans {
  ad: string
  oran: string
  tedarikci: string
}

export interface Uretim {
  id: string
  parfumNo: number
  hacimMl: number
  adet: number
  kalanAdet: number
  uretimTarihi: Timestamp
  demlenmeGun: number
  demlenmeBitis: Timestamp
  esanslar: Esans[]
  notlar: string
  maliyet: number
  olusturmaTarihi?: Timestamp
}

export interface Musteri {
  ad: string
  telefon: string
  adres: string
  not: string
}

export interface SiparisKalemi {
  parfumNo: number
  kod: string
  adet: number
  birimFiyat: number
}

export type SiparisDurumu =
  | 'Yeni'
  | 'Hazırlanıyor'
  | 'Kargolandı'
  | 'Teslim Edildi'
  | 'Ödendi'
  | 'İptal'

export const SIPARIS_DURUMLARI: SiparisDurumu[] = [
  'Yeni',
  'Hazırlanıyor',
  'Kargolandı',
  'Teslim Edildi',
  'Ödendi',
  'İptal',
]

export type SiparisKaynagi = 'WhatsApp' | 'Telefon' | 'Elden' | 'Shopier'

export const SIPARIS_KAYNAKLARI: SiparisKaynagi[] = ['WhatsApp', 'Telefon', 'Elden', 'Shopier']

export type OdemeYontemi = 'Havale/EFT' | 'Kapıda' | 'Shopier' | 'Nakit'

export const ODEME_YONTEMLERI: OdemeYontemi[] = ['Havale/EFT', 'Kapıda', 'Shopier', 'Nakit']

/** Bir siparişin hangi üretim partisinden kaç adet düştüğünün kaydı. */
export interface StokDusum {
  uretimId: string
  parfumNo: number
  adet: number
}

export interface Siparis {
  id: string
  siparisNo: string
  kaynak: SiparisKaynagi
  shopierSiparisId: string
  musteri: Musteri
  urunler: SiparisKalemi[]
  toplamTutar: number
  durum: SiparisDurumu
  siparisTarihi: Timestamp
  kargoTarihi: Timestamp | null
  kargoFirmasi: string
  kargoTakipNo: string
  odemeTarihi: Timestamp | null
  odemeYontemi: OdemeYontemi
  arsiv: boolean
  notlar: string
  /** Stok düşümü uygulandıysa hangi partilerden düşüldüğü (iptalde geri yüklenir). */
  stokDusumleri?: StokDusum[]
}

export interface EsansSozluk {
  id: string
  ad: string
  tedarikci: string
  kullanimSayisi: number
}

export interface Ayarlar {
  varsayilanDemlenmeGun: number
  varsayilanFiyat: number
  varsayilanHacimMl: number
  kargoFirmalari: string[]
  dusukStokEsigi: number
  tema: 'acik' | 'koyu' | 'sistem'
  /** Siparişte ürün eklendiğinde stok otomatik düşsün mü? */
  otomatikStokDusumu: boolean
}

export const VARSAYILAN_AYARLAR: Ayarlar = {
  varsayilanDemlenmeGun: 30,
  varsayilanFiyat: 2500,
  varsayilanHacimMl: 100,
  kargoFirmalari: ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo'],
  dusukStokEsigi: 2,
  tema: 'sistem',
  otomatikStokDusumu: true,
}
