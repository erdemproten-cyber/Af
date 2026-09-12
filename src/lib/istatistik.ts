import type { Siparis, Uretim } from '../types'
import { ayAnahtari, ayBasi, gunBasi, gunEkle, haftaBasi, tarihe } from './date'
import { demlenmeDurumu, type ParfumStogu } from './demlenme'

export interface DonemOzeti {
  adet: number
  ciro: number
}

function donemOzeti(siparisler: Siparis[], baslangic: Date): DonemOzeti {
  let adet = 0
  let ciro = 0
  for (const siparis of siparisler) {
    if (siparis.durum === 'İptal') continue
    const t = tarihe(siparis.siparisTarihi)
    if (!t || t < baslangic) continue
    adet++
    ciro += siparis.toplamTutar
  }
  return { adet, ciro }
}

export interface PanelOzeti {
  bugun: DonemOzeti
  buHafta: DonemOzeti
  buAy: DonemOzeti
  /** Ödemesi alınmamış (arşive girmemiş) siparişlerin toplamı. */
  bekleyenTahsilat: number
  bekleyenAdet: number
}

export function panelOzeti(siparisler: Siparis[], simdi = new Date()): PanelOzeti {
  const bekleyenler = siparisler.filter((s) => !s.arsiv && s.durum !== 'İptal' && !s.odemeTarihi)
  return {
    bugun: donemOzeti(siparisler, gunBasi(simdi)),
    buHafta: donemOzeti(siparisler, haftaBasi(simdi)),
    buAy: donemOzeti(siparisler, ayBasi(simdi)),
    bekleyenTahsilat: bekleyenler.reduce((t, s) => t + s.toplamTutar, 0),
    bekleyenAdet: bekleyenler.length,
  }
}

/** Kargolanmayı bekleyenler: Yeni veya Hazırlanıyor. */
export function kargoBekleyenler(siparisler: Siparis[]): Siparis[] {
  return siparisler.filter(
    (s) => !s.arsiv && (s.durum === 'Yeni' || s.durum === 'Hazırlanıyor'),
  )
}

/** Kargolandı/teslim edildi ama ödemesi alınmamış olanlar. */
export function odemeBekleyenler(siparisler: Siparis[]): Siparis[] {
  return siparisler.filter(
    (s) =>
      !s.arsiv &&
      !s.odemeTarihi &&
      (s.durum === 'Kargolandı' || s.durum === 'Teslim Edildi'),
  )
}

/** Son `gun` gün içinde demlenmesi tamamlanan partiler. */
export function demlenmesiBitenler(uretimler: Uretim[], gun = 7, simdi = new Date()): Uretim[] {
  const esik = gunEkle(simdi, -gun)
  return uretimler.filter((u) => {
    if (u.kalanAdet <= 0) return false
    const bitis = tarihe(u.demlenmeBitis)
    if (!bitis) return false
    return bitis <= simdi && bitis >= esik
  })
}

export interface DusukStok {
  parfumNo: number
  hazirAdet: number
  demlenenAdet: number
  enYakinHazirGun: number | null
}

export function dusukStoklar(stokHaritasi: Map<number, ParfumStogu>, esik: number): DusukStok[] {
  return [...stokHaritasi.values()]
    .filter((s) => s.hazirAdet < esik)
    .map((s) => ({
      parfumNo: s.parfumNo,
      hazirAdet: s.hazirAdet,
      demlenenAdet: s.demlenenAdet,
      enYakinHazirGun: s.enYakinHazirGun,
    }))
    .sort((a, b) => a.hazirAdet - b.hazirAdet || a.parfumNo - b.parfumNo)
}

export interface UretimOnerisi {
  parfumNo: number
  /** Son `pencereGun` gün içinde satılan adet. */
  satilan: number
  /** Aylık ortalama satış hızı. */
  aylikHiz: number
  hazirAdet: number
  demlenenAdet: number
  /** Hazır stok kaç günde tükenir? */
  tukenmeGunu: number
  /** Demlenme süresini karşılamak için önerilen üretim adedi. */
  onerilenAdet: number
}

/**
 * Son 90 günün satış hızına bakarak "şimdi üretmelisin" listesi çıkarır.
 * 30 günlük demlenme süresi nedeniyle stok, demlenme süresinden önce bitecekse uyarır.
 */
export function uretimOnerileri(
  siparisler: Siparis[],
  stokHaritasi: Map<number, ParfumStogu>,
  demlenmeGun = 30,
  pencereGun = 90,
  simdi = new Date(),
): UretimOnerisi[] {
  const esik = gunEkle(simdi, -pencereGun)
  const satislar = new Map<number, number>()

  for (const siparis of siparisler) {
    if (siparis.durum === 'İptal') continue
    const t = tarihe(siparis.siparisTarihi)
    if (!t || t < esik) continue
    for (const urun of siparis.urunler) {
      satislar.set(urun.parfumNo, (satislar.get(urun.parfumNo) ?? 0) + urun.adet)
    }
  }

  const oneriler: UretimOnerisi[] = []

  for (const [parfumNo, satilan] of satislar) {
    if (satilan <= 0) continue
    const stok = stokHaritasi.get(parfumNo)
    const hazirAdet = stok?.hazirAdet ?? 0
    const demlenenAdet = stok?.demlenenAdet ?? 0
    const gunlukHiz = satilan / pencereGun
    const tukenmeGunu = gunlukHiz > 0 ? Math.floor((hazirAdet + demlenenAdet) / gunlukHiz) : Infinity

    // Demlenme süresi + bir haftalık pay içinde tükenecekse üretim gerekir.
    if (tukenmeGunu > demlenmeGun + 7) continue

    const gerekli = Math.ceil(gunlukHiz * (demlenmeGun + 30)) - (hazirAdet + demlenenAdet)
    oneriler.push({
      parfumNo,
      satilan,
      aylikHiz: Number((gunlukHiz * 30).toFixed(1)),
      hazirAdet,
      demlenenAdet,
      tukenmeGunu: Number.isFinite(tukenmeGunu) ? tukenmeGunu : 0,
      onerilenAdet: Math.max(1, gerekli),
    })
  }

  return oneriler.sort((a, b) => a.tukenmeGunu - b.tukenmeGunu)
}

export interface AylikCiro {
  anahtar: string
  ciro: number
  adet: number
}

export function aylikCiro(siparisler: Siparis[], ayAdedi = 12, simdi = new Date()): AylikCiro[] {
  const haritalar = new Map<string, AylikCiro>()

  for (let i = ayAdedi - 1; i >= 0; i--) {
    const ay = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1)
    haritalar.set(ayAnahtari(ay), { anahtar: ayAnahtari(ay), ciro: 0, adet: 0 })
  }

  for (const siparis of siparisler) {
    if (siparis.durum === 'İptal') continue
    const t = tarihe(siparis.siparisTarihi)
    if (!t) continue
    const kayit = haritalar.get(ayAnahtari(t))
    if (!kayit) continue
    kayit.ciro += siparis.toplamTutar
    kayit.adet++
  }

  return [...haritalar.values()]
}

export interface CokSatan {
  parfumNo: number
  adet: number
  ciro: number
}

export function cokSatanlar(siparisler: Siparis[], limit = 10, baslangic?: Date): CokSatan[] {
  const harita = new Map<number, CokSatan>()

  for (const siparis of siparisler) {
    if (siparis.durum === 'İptal') continue
    if (baslangic) {
      const t = tarihe(siparis.siparisTarihi)
      if (!t || t < baslangic) continue
    }
    for (const urun of siparis.urunler) {
      const kayit = harita.get(urun.parfumNo) ?? { parfumNo: urun.parfumNo, adet: 0, ciro: 0 }
      kayit.adet += urun.adet
      kayit.ciro += urun.adet * urun.birimFiyat
      harita.set(urun.parfumNo, kayit)
    }
  }

  return [...harita.values()].sort((a, b) => b.adet - a.adet).slice(0, limit)
}

export interface MusteriOzeti {
  telefon: string
  ad: string
  siparisAdedi: number
  toplamTutar: number
  sonSiparis: Date | null
  favoriNumaralar: number[]
}

/** Aynı telefon numarasının siparişlerini tek kayıtta toplar. */
export function musteriOzetleri(siparisler: Siparis[]): MusteriOzeti[] {
  const harita = new Map<string, MusteriOzeti & { numaraSayaci: Map<number, number> }>()

  for (const siparis of siparisler) {
    if (siparis.durum === 'İptal') continue
    const anahtar = siparis.musteri.telefon.replace(/\D/g, '').slice(-10) || siparis.musteri.ad.trim()
    if (!anahtar) continue

    const kayit =
      harita.get(anahtar) ??
      {
        telefon: siparis.musteri.telefon,
        ad: siparis.musteri.ad,
        siparisAdedi: 0,
        toplamTutar: 0,
        sonSiparis: null as Date | null,
        favoriNumaralar: [] as number[],
        numaraSayaci: new Map<number, number>(),
      }

    kayit.siparisAdedi++
    kayit.toplamTutar += siparis.toplamTutar
    if (siparis.musteri.ad && !kayit.ad) kayit.ad = siparis.musteri.ad
    const t = tarihe(siparis.siparisTarihi)
    if (t && (!kayit.sonSiparis || t > kayit.sonSiparis)) kayit.sonSiparis = t
    for (const urun of siparis.urunler) {
      kayit.numaraSayaci.set(urun.parfumNo, (kayit.numaraSayaci.get(urun.parfumNo) ?? 0) + urun.adet)
    }

    harita.set(anahtar, kayit)
  }

  return [...harita.values()]
    .map(({ numaraSayaci, ...kayit }) => ({
      ...kayit,
      favoriNumaralar: [...numaraSayaci.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([no]) => no),
    }))
    .sort((a, b) => b.toplamTutar - a.toplamTutar)
}

/** Demlenme yüzdesi en yüksek olan ama henüz bitmemiş partiler (panel kutusu). */
export function yakindaHazirOlanlar(uretimler: Uretim[], gun = 7, simdi = new Date()): Uretim[] {
  return uretimler
    .filter((u) => {
      if (u.kalanAdet <= 0) return false
      const durum = demlenmeDurumu(u, simdi)
      return !durum.hazir && durum.kalanGun <= gun
    })
    .sort((a, b) => demlenmeDurumu(a, simdi).kalanGun - demlenmeDurumu(b, simdi).kalanGun)
}
