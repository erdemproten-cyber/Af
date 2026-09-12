import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { sayaclarYolu, siparisYolu, uretimYolu } from './yollar'
import type {
  Musteri,
  OdemeYontemi,
  Siparis,
  SiparisDurumu,
  SiparisKalemi,
  SiparisKaynagi,
  StokDusum,
} from '../types'
import { adayPartiler, siparisDusumPlani } from './stok'

export interface SiparisGirdi {
  kaynak: SiparisKaynagi
  shopierSiparisId?: string
  musteri: Musteri
  urunler: SiparisKalemi[]
  durum: SiparisDurumu
  siparisTarihi: Date
  odemeYontemi: OdemeYontemi
  notlar: string
  kargoFirmasi?: string
  kargoTakipNo?: string
}

export interface SiparisOlusturmaSonucu {
  id: string
  siparisNo: string
  /** parfumNo → stoktan karşılanamayan adet (uyarı amaçlı; sipariş yine de oluşur). */
  eksikler: Array<{ parfumNo: number; adet: number }>
}

export function toplamHesapla(urunler: SiparisKalemi[]): number {
  return urunler.reduce((toplam, u) => toplam + (u.adet || 0) * (u.birimFiyat || 0), 0)
}

/** "SP-2026-0001" — yıl bazlı, işlem (transaction) içinde artırılır. */
function siparisNoUret(yil: number, sayac: number): string {
  return `SP-${yil}-${String(sayac).padStart(4, '0')}`
}

/**
 * Sipariş oluşturur:
 *  1. Sipariş numarasını sayaçtan atomik olarak alır.
 *  2. FIFO ile (en eski demlenmesi tamamlanmış parti önce) stok düşer.
 *  3. Stok yetmezse engellemez, eksikleri geri döndürür.
 */
export async function siparisOlustur(
  uid: string,
  girdi: SiparisGirdi,
  stokDus = true,
): Promise<SiparisOlusturmaSonucu> {
  // İşlem dışında aday partileri çek (transaction içinde sorgu yapılamaz).
  const partiHaritasi = stokDus ? await adayPartiler(uid, girdi.urunler) : new Map()
  const plan = stokDus
    ? siparisDusumPlani(girdi.urunler, partiHaritasi, girdi.siparisTarihi)
    : { dusumler: [] as StokDusum[], eksikler: new Map<number, number>() }

  const yil = girdi.siparisTarihi.getFullYear()
  const siparisRef = doc(siparisYolu(uid))

  const siparisNo = await runTransaction(db, async (islem) => {
    // --- Tüm okumalar önce ---
    const sayacRef = sayaclarYolu(uid)
    const sayacAnlik = await islem.get(sayacRef)
    const sayaclar = (sayacAnlik.data() ?? {}) as Record<string, number>
    const siradaki = (Number(sayaclar[`siparis_${yil}`]) || 0) + 1

    const partiAnliklari = await Promise.all(
      plan.dusumler.map(async (d) => ({
        dusum: d,
        anlik: await islem.get(doc(uretimYolu(uid), d.uretimId)),
      })),
    )

    // --- Sonra yazmalar ---
    const gercekDusumler: StokDusum[] = []
    for (const { dusum, anlik } of partiAnliklari) {
      if (!anlik.exists()) continue
      const kalan = Number(anlik.data()?.kalanAdet) || 0
      const dusulecek = Math.min(kalan, dusum.adet)
      if (dusulecek <= 0) continue
      islem.update(anlik.ref, { kalanAdet: kalan - dusulecek })
      gercekDusumler.push({ ...dusum, adet: dusulecek })
    }

    const no = siparisNoUret(yil, siradaki)
    islem.set(sayacRef, { [`siparis_${yil}`]: siradaki }, { merge: true })

    const odendi = girdi.durum === 'Ödendi'
    islem.set(siparisRef, {
      siparisNo: no,
      kaynak: girdi.kaynak,
      shopierSiparisId: girdi.shopierSiparisId ?? '',
      musteri: girdi.musteri,
      urunler: girdi.urunler,
      toplamTutar: toplamHesapla(girdi.urunler),
      durum: girdi.durum,
      siparisTarihi: Timestamp.fromDate(girdi.siparisTarihi),
      kargoTarihi: null,
      kargoFirmasi: girdi.kargoFirmasi ?? '',
      kargoTakipNo: girdi.kargoTakipNo ?? '',
      odemeTarihi: odendi ? Timestamp.fromDate(girdi.siparisTarihi) : null,
      odemeYontemi: girdi.odemeYontemi,
      arsiv: odendi,
      notlar: girdi.notlar,
      stokDusumleri: gercekDusumler,
      olusturmaTarihi: serverTimestamp(),
    })

    return no
  })

  return {
    id: siparisRef.id,
    siparisNo,
    eksikler: [...plan.eksikler.entries()].map(([parfumNo, adet]) => ({ parfumNo, adet })),
  }
}

export async function siparisGuncelle(
  uid: string,
  id: string,
  degisiklikler: Partial<{
    musteri: Musteri
    urunler: SiparisKalemi[]
    kaynak: SiparisKaynagi
    odemeYontemi: OdemeYontemi
    notlar: string
    siparisTarihi: Date
  }>,
): Promise<void> {
  const veri: Record<string, unknown> = { ...degisiklikler }
  if (degisiklikler.urunler) veri.toplamTutar = toplamHesapla(degisiklikler.urunler)
  if (degisiklikler.siparisTarihi) veri.siparisTarihi = Timestamp.fromDate(degisiklikler.siparisTarihi)
  await updateDoc(doc(siparisYolu(uid), id), veri)
}

export async function durumGuncelle(uid: string, id: string, durum: SiparisDurumu): Promise<void> {
  await updateDoc(doc(siparisYolu(uid), id), { durum })
}

/** Kargola: tarih + firma + takip numarası. */
export async function kargola(
  uid: string,
  id: string,
  bilgi: { tarih: Date; firma: string; takipNo: string },
): Promise<void> {
  await updateDoc(doc(siparisYolu(uid), id), {
    durum: 'Kargolandı',
    kargoTarihi: Timestamp.fromDate(bilgi.tarih),
    kargoFirmasi: bilgi.firma,
    kargoTakipNo: bilgi.takipNo,
  })
}

/** Ödeme alındı: tarihi yazar ve kaydı otomatik arşive taşır. */
export async function odemeAl(
  uid: string,
  id: string,
  bilgi: { tarih: Date; yontem: OdemeYontemi },
): Promise<void> {
  await updateDoc(doc(siparisYolu(uid), id), {
    durum: 'Ödendi',
    odemeTarihi: Timestamp.fromDate(bilgi.tarih),
    odemeYontemi: bilgi.yontem,
    arsiv: true,
  })
}

export async function arsivDurumu(uid: string, id: string, arsiv: boolean): Promise<void> {
  await updateDoc(doc(siparisYolu(uid), id), { arsiv })
}

/** İptal: stok düşümü yapılmışsa partilere geri yükler. */
export async function siparisIptal(uid: string, id: string): Promise<void> {
  await runTransaction(db, async (islem) => {
    const siparisRef = doc(siparisYolu(uid), id)
    const anlik = await islem.get(siparisRef)
    if (!anlik.exists()) return

    const dusumler = (anlik.data()?.stokDusumleri ?? []) as StokDusum[]
    const partiler = await Promise.all(
      dusumler.map(async (d) => ({ dusum: d, anlik: await islem.get(doc(uretimYolu(uid), d.uretimId)) })),
    )

    for (const { dusum, anlik: parti } of partiler) {
      if (!parti.exists()) continue
      const veri = parti.data()
      const kalan = Number(veri?.kalanAdet) || 0
      const toplam = Number(veri?.adet) || 0
      islem.update(parti.ref, { kalanAdet: Math.min(toplam, kalan + dusum.adet) })
    }

    islem.update(siparisRef, { durum: 'İptal', arsiv: false, stokDusumleri: [] })
  })
}

/** Siparişi tamamen siler; stok düşümü varsa geri yükler. */
export async function siparisSil(uid: string, id: string): Promise<void> {
  const siparisRef = doc(siparisYolu(uid), id)
  const anlik = await getDoc(siparisRef)
  if (anlik.exists() && (anlik.data()?.stokDusumleri ?? []).length > 0) {
    await siparisIptal(uid, id)
  }
  await deleteDoc(siparisRef)
}

/** Aynı telefondan gelen geçmiş siparişler (müşteri kartı için). */
export function musteriSiparisleri(siparisler: Siparis[], telefon: string): Siparis[] {
  const hedef = telefon.replace(/\D/g, '').slice(-10)
  if (!hedef) return []
  return siparisler.filter((s) => s.musteri.telefon.replace(/\D/g, '').slice(-10) === hedef)
}
