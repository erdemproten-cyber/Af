import {
  addDoc,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { esansYolu, uretimYolu } from './yollar'
import type { Esans } from '../types'
import { GUN_MS } from '../lib/date'
import { aramaMetni } from '../lib/format'

export interface UretimGirdi {
  parfumNo: number
  hacimMl: number
  adet: number
  kalanAdet?: number
  uretimTarihi: Date
  demlenmeGun: number
  esanslar: Esans[]
  notlar: string
  maliyet: number
}

function belgeyeCevir(girdi: UretimGirdi) {
  const demlenmeGun = Math.max(0, girdi.demlenmeGun || 0)
  return {
    parfumNo: girdi.parfumNo,
    hacimMl: girdi.hacimMl,
    adet: girdi.adet,
    kalanAdet: girdi.kalanAdet ?? girdi.adet,
    uretimTarihi: Timestamp.fromDate(girdi.uretimTarihi),
    demlenmeGun,
    demlenmeBitis: Timestamp.fromMillis(girdi.uretimTarihi.getTime() + demlenmeGun * GUN_MS),
    esanslar: girdi.esanslar.filter((e) => e.ad.trim() !== ''),
    notlar: girdi.notlar,
    maliyet: girdi.maliyet,
  }
}

export async function uretimEkle(uid: string, girdi: UretimGirdi): Promise<string> {
  const belge = await addDoc(uretimYolu(uid), {
    ...belgeyeCevir(girdi),
    olusturmaTarihi: serverTimestamp(),
  })
  await esanslariSozlugeEkle(uid, girdi.esanslar)
  return belge.id
}

export async function uretimGuncelle(uid: string, id: string, girdi: UretimGirdi): Promise<void> {
  await updateDoc(doc(uretimYolu(uid), id), belgeyeCevir(girdi))
  await esanslariSozlugeEkle(uid, girdi.esanslar)
}

export async function uretimSil(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(uretimYolu(uid), id))
}

/** Elle stok düzeltmesi (fire, numune, sayım farkı). */
export async function kalanAdetDuzelt(uid: string, id: string, yeniKalan: number): Promise<void> {
  await updateDoc(doc(uretimYolu(uid), id), { kalanAdet: Math.max(0, Math.trunc(yeniKalan)) })
}

/** Esans adlarını sözlüğe ekler; üretim formunda otomatik tamamlama için kullanılır. */
export async function esanslariSozlugeEkle(uid: string, esanslar: Esans[]): Promise<void> {
  const benzersiz = new Map<string, Esans>()
  for (const esans of esanslar) {
    const ad = esans.ad.trim()
    if (!ad) continue
    benzersiz.set(aramaMetni(ad).replace(/[^a-z0-9]+/g, '-'), { ...esans, ad })
  }

  await Promise.all(
    [...benzersiz.entries()].map(([id, esans]) =>
      setDoc(
        doc(esansYolu(uid), id),
        {
          ad: esans.ad,
          tedarikci: esans.tedarikci ?? '',
          kullanimSayisi: increment(1),
          sonKullanim: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => {
        /* sözlük ikincil veridir; hatası üretim kaydını bozmasın */
      }),
    ),
  )
}

export async function esansSil(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(esansYolu(uid), id))
}
