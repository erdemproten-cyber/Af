import { Timestamp } from 'firebase/firestore'

export const GUN_MS = 24 * 60 * 60 * 1000

/** Firestore Timestamp / Date / null → Date | null (çevrimdışı beklemede null gelebilir) */
export function tarihe(deger: Timestamp | Date | null | undefined): Date | null {
  if (!deger) return null
  if (deger instanceof Date) return deger
  if (typeof (deger as Timestamp).toDate === 'function') return (deger as Timestamp).toDate()
  return null
}

export function zamanDamgasi(d: Date): Timestamp {
  return Timestamp.fromDate(d)
}

export function gunBasi(d: Date = new Date()): Date {
  const k = new Date(d)
  k.setHours(0, 0, 0, 0)
  return k
}

export function gunSonu(d: Date = new Date()): Date {
  const k = new Date(d)
  k.setHours(23, 59, 59, 999)
  return k
}

/** Haftanın başı — Pazartesi. */
export function haftaBasi(d: Date = new Date()): Date {
  const k = gunBasi(d)
  const gun = (k.getDay() + 6) % 7
  k.setDate(k.getDate() - gun)
  return k
}

export function ayBasi(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function gunEkle(d: Date, gun: number): Date {
  const k = new Date(d)
  k.setDate(k.getDate() + gun)
  return k
}

/** İki tarih arasındaki tam gün farkı (takvim günü bazlı). */
export function gunFarki(baslangic: Date, bitis: Date): number {
  return Math.round((gunBasi(bitis).getTime() - gunBasi(baslangic).getTime()) / GUN_MS)
}

/** "2026-09" biçiminde ay anahtarı (raporlarda gruplama için). */
export function ayAnahtari(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const AY_ADLARI = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]

export function ayEtiketi(anahtar: string): string {
  const [yil, ay] = anahtar.split('-').map(Number)
  return `${AY_ADLARI[(ay || 1) - 1]} ${String(yil).slice(2)}`
}
