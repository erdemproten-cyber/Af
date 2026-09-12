import type { Uretim } from '../types'
import { GUN_MS, gunFarki, tarihe } from './date'

export interface DemlenmeDurumu {
  /** 0–100 arası tamamlanma yüzdesi. */
  yuzde: number
  hazir: boolean
  /** Demlenmenin bitmesine kalan tam gün (hazırsa 0). */
  kalanGun: number
  uretimTarihi: Date | null
  bitisTarihi: Date | null
  toplamGun: number
}

/**
 * Bir üretim partisinin demlenme durumunu hesaplar.
 * Yüzde = (bugün - üretimTarihi) / demlenmeGun.
 */
export function demlenmeDurumu(uretim: Uretim, simdi: Date = new Date()): DemlenmeDurumu {
  const baslangic = tarihe(uretim.uretimTarihi)
  const bitis = tarihe(uretim.demlenmeBitis)
  const toplamGun = Math.max(1, uretim.demlenmeGun || 30)

  if (!baslangic) {
    return { yuzde: 0, hazir: false, kalanGun: toplamGun, uretimTarihi: null, bitisTarihi: bitis, toplamGun }
  }

  const hedef = bitis ?? new Date(baslangic.getTime() + toplamGun * GUN_MS)
  const gecen = (simdi.getTime() - baslangic.getTime()) / GUN_MS
  const yuzde = Math.max(0, Math.min(100, Math.round((gecen / toplamGun) * 100)))
  const hazir = simdi.getTime() >= hedef.getTime()
  const kalanGun = hazir ? 0 : Math.max(0, gunFarki(simdi, hedef))

  return { yuzde: hazir ? 100 : yuzde, hazir, kalanGun, uretimTarihi: baslangic, bitisTarihi: hedef, toplamGun }
}

export function demlenmeHazirMi(uretim: Uretim, simdi: Date = new Date()): boolean {
  return demlenmeDurumu(uretim, simdi).hazir
}

/** Bar rengi: 0–50 kırmızımsı, 50–99 turuncu, 100 yeşil. */
export function demlenmeRengi(yuzde: number): { bar: string; metin: string; zemin: string } {
  if (yuzde >= 100) {
    return {
      bar: 'bg-emerald-500',
      metin: 'text-emerald-700 dark:text-emerald-400',
      zemin: 'bg-emerald-100 dark:bg-emerald-500/15',
    }
  }
  if (yuzde >= 50) {
    return {
      bar: 'bg-amber-500',
      metin: 'text-amber-700 dark:text-amber-400',
      zemin: 'bg-amber-100 dark:bg-amber-500/15',
    }
  }
  return {
    bar: 'bg-rose-500',
    metin: 'text-rose-700 dark:text-rose-400',
    zemin: 'bg-rose-100 dark:bg-rose-500/15',
  }
}

export interface ParfumStogu {
  parfumNo: number
  /** Demlenmesi tamamlanmış ve satılabilir adet. */
  hazirAdet: number
  /** Hâlâ demlenen adet. */
  demlenenAdet: number
  toplamAdet: number
  partiler: Uretim[]
  /** Demlenmesi en erken bitecek partinin kalan günü (hepsi hazırsa null). */
  enYakinHazirGun: number | null
}

/** Üretim partilerini parfüm numarasına göre gruplayıp stok özetini çıkarır. */
export function stokOzeti(uretimler: Uretim[], simdi: Date = new Date()): Map<number, ParfumStogu> {
  const harita = new Map<number, ParfumStogu>()

  for (const uretim of uretimler) {
    const kalan = Math.max(0, uretim.kalanAdet ?? 0)
    const mevcut = harita.get(uretim.parfumNo) ?? {
      parfumNo: uretim.parfumNo,
      hazirAdet: 0,
      demlenenAdet: 0,
      toplamAdet: 0,
      partiler: [],
      enYakinHazirGun: null,
    }

    const durum = demlenmeDurumu(uretim, simdi)
    if (durum.hazir) {
      mevcut.hazirAdet += kalan
    } else {
      mevcut.demlenenAdet += kalan
      if (kalan > 0 && (mevcut.enYakinHazirGun === null || durum.kalanGun < mevcut.enYakinHazirGun)) {
        mevcut.enYakinHazirGun = durum.kalanGun
      }
    }
    mevcut.toplamAdet += kalan
    mevcut.partiler.push(uretim)
    harita.set(uretim.parfumNo, mevcut)
  }

  for (const stok of harita.values()) {
    stok.partiler.sort((a, b) => {
      const at = tarihe(a.uretimTarihi)?.getTime() ?? 0
      const bt = tarihe(b.uretimTarihi)?.getTime() ?? 0
      return bt - at
    })
  }

  return harita
}
