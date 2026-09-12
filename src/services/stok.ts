import { getDocs, orderBy, query, where } from 'firebase/firestore'
import type { SiparisKalemi, Uretim } from '../types'
import { uretimYolu } from './yollar'
import { uretimBelgeden } from './donusum'

// Saf planlama mantığı Firestore'dan ayrı tutulur; testler oradan içe aktarır.
export { dusumPlaniHesapla, siparisDusumPlani } from '../lib/stokPlani'
export type { DusumPlani, StokSonucu } from '../lib/stokPlani'

/** Bir siparişin tüm kalemleri için aday partileri Firestore'dan çeker. */
export async function adayPartiler(
  uid: string,
  urunler: SiparisKalemi[],
): Promise<Map<number, Uretim[]>> {
  const numaralar = [...new Set(urunler.map((u) => u.parfumNo))]
  const harita = new Map<number, Uretim[]>()

  await Promise.all(
    numaralar.map(async (no) => {
      const anlik = await getDocs(
        query(uretimYolu(uid), where('parfumNo', '==', no), orderBy('uretimTarihi', 'asc')),
      )
      harita.set(
        no,
        anlik.docs.map((d) => uretimBelgeden(d.id, d.data())),
      )
    }),
  )

  return harita
}
