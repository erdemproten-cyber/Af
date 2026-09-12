import { getDocs, orderBy, query, where } from 'firebase/firestore'
import type { Uretim, SiparisKalemi, StokDusum } from '../types'
import { uretimYolu } from './yollar'
import { demlenmeHazirMi } from '../lib/demlenme'
import { tarihe } from '../lib/date'
import { uretimBelgeden } from './donusum'

/** Bir kalem için stok düşüm planı. */
export interface DusumPlani {
  dusumler: StokDusum[]
  /** Karşılanamayan adet (stok yetmediyse > 0). */
  eksik: number
}

/**
 * FIFO: en eski **demlenmesi tamamlanmış** parti önce düşülür.
 * Demlenmesi bitmemiş partilere dokunulmaz — onlar satılabilir stok sayılmaz.
 */
export function dusumPlaniHesapla(
  partiler: Uretim[],
  istenenAdet: number,
  simdi: Date = new Date(),
): DusumPlani {
  const uygun = partiler
    .filter((p) => (p.kalanAdet ?? 0) > 0 && demlenmeHazirMi(p, simdi))
    .sort((a, b) => {
      const at = tarihe(a.uretimTarihi)?.getTime() ?? 0
      const bt = tarihe(b.uretimTarihi)?.getTime() ?? 0
      return at - bt
    })

  const dusumler: StokDusum[] = []
  let kalan = Math.max(0, istenenAdet)

  for (const parti of uygun) {
    if (kalan <= 0) break
    const alinacak = Math.min(kalan, parti.kalanAdet)
    if (alinacak > 0) {
      dusumler.push({ uretimId: parti.id, parfumNo: parti.parfumNo, adet: alinacak })
      kalan -= alinacak
    }
  }

  return { dusumler, eksik: kalan }
}

/** Bir siparişin tüm kalemleri için aday partileri Firestore'dan çeker. */
export async function adayPartiler(uid: string, urunler: SiparisKalemi[]): Promise<Map<number, Uretim[]>> {
  const numaralar = [...new Set(urunler.map((u) => u.parfumNo))]
  const harita = new Map<number, Uretim[]>()

  await Promise.all(
    numaralar.map(async (no) => {
      const s = await getDocs(
        query(uretimYolu(uid), where('parfumNo', '==', no), orderBy('uretimTarihi', 'asc')),
      )
      harita.set(
        no,
        s.docs.map((d) => uretimBelgeden(d.id, d.data())),
      )
    }),
  )

  return harita
}

export interface StokSonucu {
  dusumler: StokDusum[]
  /** parfumNo → karşılanamayan adet */
  eksikler: Map<number, number>
}

/** Tüm kalemler için düşüm planı; eksikler ayrıca raporlanır (engellemez, uyarır). */
export function siparisDusumPlani(
  urunler: SiparisKalemi[],
  partiHaritasi: Map<number, Uretim[]>,
  simdi: Date = new Date(),
): StokSonucu {
  const eksikler = new Map<number, number>()
  // Aynı numara birden fazla kalemde geçebileceği için kalan adetleri yerel olarak izleriz.
  const kalanlar = new Map<string, number>()
  for (const partiler of partiHaritasi.values()) {
    for (const parti of partiler) kalanlar.set(parti.id, Math.max(0, parti.kalanAdet ?? 0))
  }

  const birlesik = new Map<string, StokDusum>()

  for (const kalem of urunler) {
    const partiler = (partiHaritasi.get(kalem.parfumNo) ?? []).map((parti) => ({
      ...parti,
      kalanAdet: kalanlar.get(parti.id) ?? 0,
    }))

    const plan = dusumPlaniHesapla(partiler, kalem.adet, simdi)

    for (const dusum of plan.dusumler) {
      kalanlar.set(dusum.uretimId, (kalanlar.get(dusum.uretimId) ?? 0) - dusum.adet)
      const mevcut = birlesik.get(dusum.uretimId)
      if (mevcut) mevcut.adet += dusum.adet
      else birlesik.set(dusum.uretimId, { ...dusum })
    }

    if (plan.eksik > 0) {
      eksikler.set(kalem.parfumNo, (eksikler.get(kalem.parfumNo) ?? 0) + plan.eksik)
    }
  }

  return { dusumler: [...birlesik.values()], eksikler }
}
