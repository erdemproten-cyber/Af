import { Timestamp, type DocumentData } from 'firebase/firestore'
import type {
  Ayarlar,
  Cinsiyet,
  Esans,
  EsansSozluk,
  KatalogUrun,
  OdemeYontemi,
  Siparis,
  SiparisDurumu,
  SiparisKalemi,
  SiparisKaynagi,
  Uretim,
} from '../types'
import { VARSAYILAN_AYARLAR } from '../types'
import { urunKodu } from '../lib/format'

const sayiya = (d: unknown, varsayilan = 0): number => {
  const s = Number(d)
  return Number.isFinite(s) ? s : varsayilan
}

const metne = (d: unknown, varsayilan = ''): string =>
  typeof d === 'string' ? d : d === null || d === undefined ? varsayilan : String(d)

const zamana = (d: unknown): Timestamp | null => (d instanceof Timestamp ? d : null)

export function katalogBelgeden(id: string, veri: DocumentData): KatalogUrun {
  const no = sayiya(veri.no)
  return {
    id,
    no,
    kod: metne(veri.kod) || urunKodu(no),
    cinsiyet: (['Kadın', 'Erkek', 'Unisex'].includes(veri.cinsiyet) ? veri.cinsiyet : 'Unisex') as Cinsiyet,
    aciklama: metne(veri.aciklama),
    varsayilanFiyat: sayiya(veri.varsayilanFiyat),
    aktif: veri.aktif !== false,
  }
}

export function esanslarCoz(veri: unknown): Esans[] {
  if (!Array.isArray(veri)) return []
  return veri
    .map((e) => ({
      ad: metne((e as Esans)?.ad),
      oran: metne((e as Esans)?.oran),
      tedarikci: metne((e as Esans)?.tedarikci),
    }))
    .filter((e) => e.ad || e.oran || e.tedarikci)
}

export function uretimBelgeden(id: string, veri: DocumentData): Uretim {
  const demlenmeGun = sayiya(veri.demlenmeGun, 30) || 30
  return {
    id,
    parfumNo: sayiya(veri.parfumNo),
    hacimMl: sayiya(veri.hacimMl, 100),
    adet: sayiya(veri.adet),
    kalanAdet: sayiya(veri.kalanAdet),
    uretimTarihi: zamana(veri.uretimTarihi) ?? Timestamp.now(),
    demlenmeGun,
    demlenmeBitis:
      zamana(veri.demlenmeBitis) ??
      Timestamp.fromMillis(
        (zamana(veri.uretimTarihi) ?? Timestamp.now()).toMillis() + demlenmeGun * 86400000,
      ),
    esanslar: esanslarCoz(veri.esanslar),
    notlar: metne(veri.notlar),
    maliyet: sayiya(veri.maliyet),
    olusturmaTarihi: zamana(veri.olusturmaTarihi) ?? undefined,
  }
}

function kalemlerCoz(veri: unknown): SiparisKalemi[] {
  if (!Array.isArray(veri)) return []
  return veri.map((u) => {
    const parfumNo = sayiya((u as SiparisKalemi)?.parfumNo)
    return {
      parfumNo,
      kod: metne((u as SiparisKalemi)?.kod) || urunKodu(parfumNo),
      adet: Math.max(1, sayiya((u as SiparisKalemi)?.adet, 1)),
      birimFiyat: sayiya((u as SiparisKalemi)?.birimFiyat),
    }
  })
}

const DURUMLAR = ['Yeni', 'Hazırlanıyor', 'Kargolandı', 'Teslim Edildi', 'Ödendi', 'İptal']
const KAYNAKLAR = ['WhatsApp', 'Telefon', 'Elden', 'Shopier']
const ODEMELER = ['Havale/EFT', 'Kapıda', 'Shopier', 'Nakit']

export function siparisBelgeden(id: string, veri: DocumentData): Siparis {
  const musteri = (veri.musteri ?? {}) as Record<string, unknown>
  return {
    id,
    siparisNo: metne(veri.siparisNo, id),
    kaynak: (KAYNAKLAR.includes(veri.kaynak) ? veri.kaynak : 'WhatsApp') as SiparisKaynagi,
    shopierSiparisId: metne(veri.shopierSiparisId),
    musteri: {
      ad: metne(musteri.ad),
      telefon: metne(musteri.telefon),
      adres: metne(musteri.adres),
      not: metne(musteri.not),
    },
    urunler: kalemlerCoz(veri.urunler),
    toplamTutar: sayiya(veri.toplamTutar),
    durum: (DURUMLAR.includes(veri.durum) ? veri.durum : 'Yeni') as SiparisDurumu,
    siparisTarihi: zamana(veri.siparisTarihi) ?? Timestamp.now(),
    kargoTarihi: zamana(veri.kargoTarihi),
    kargoFirmasi: metne(veri.kargoFirmasi),
    kargoTakipNo: metne(veri.kargoTakipNo),
    odemeTarihi: zamana(veri.odemeTarihi),
    odemeYontemi: (ODEMELER.includes(veri.odemeYontemi) ? veri.odemeYontemi : 'Havale/EFT') as OdemeYontemi,
    arsiv: veri.arsiv === true,
    notlar: metne(veri.notlar),
    stokDusumleri: Array.isArray(veri.stokDusumleri)
      ? veri.stokDusumleri.map((d: DocumentData) => ({
          uretimId: metne(d?.uretimId),
          parfumNo: sayiya(d?.parfumNo),
          adet: sayiya(d?.adet),
        }))
      : [],
  }
}

export function esansSozlukBelgeden(id: string, veri: DocumentData): EsansSozluk {
  return {
    id,
    ad: metne(veri.ad),
    tedarikci: metne(veri.tedarikci),
    kullanimSayisi: sayiya(veri.kullanimSayisi),
  }
}

export function ayarlarBelgeden(veri: DocumentData | undefined): Ayarlar {
  if (!veri) return { ...VARSAYILAN_AYARLAR }
  return {
    varsayilanDemlenmeGun: sayiya(veri.varsayilanDemlenmeGun, VARSAYILAN_AYARLAR.varsayilanDemlenmeGun) || 30,
    varsayilanFiyat: sayiya(veri.varsayilanFiyat, VARSAYILAN_AYARLAR.varsayilanFiyat),
    varsayilanHacimMl: sayiya(veri.varsayilanHacimMl, VARSAYILAN_AYARLAR.varsayilanHacimMl) || 100,
    kargoFirmalari: Array.isArray(veri.kargoFirmalari)
      ? veri.kargoFirmalari.map((k: unknown) => metne(k)).filter(Boolean)
      : [...VARSAYILAN_AYARLAR.kargoFirmalari],
    dusukStokEsigi: sayiya(veri.dusukStokEsigi, VARSAYILAN_AYARLAR.dusukStokEsigi),
    tema: (['acik', 'koyu', 'sistem'].includes(veri.tema) ? veri.tema : 'sistem') as Ayarlar['tema'],
    otomatikStokDusumu: veri.otomatikStokDusumu !== false,
  }
}
