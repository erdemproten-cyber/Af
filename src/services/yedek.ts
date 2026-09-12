import { doc, getDoc, getDocs, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import {
  ayarlarYolu,
  esansYolu,
  katalogYolu,
  sayaclarYolu,
  siparisYolu,
  uretimYolu,
} from './yollar'
import { dosyaIndir } from '../lib/csv'
import { girdiTarihi } from '../lib/format'

interface YedekBelgesi {
  id: string
  veri: Record<string, unknown>
}

export interface Yedek {
  surum: 1
  olusturma: string
  katalog: YedekBelgesi[]
  uretimler: YedekBelgesi[]
  siparisler: YedekBelgesi[]
  esanslar: YedekBelgesi[]
  ayarlar: Record<string, unknown> | null
  sayaclar: Record<string, unknown> | null
}

/** Timestamp'leri JSON'a yazılabilir biçime çevirir. */
function jsonaCevir(deger: unknown): unknown {
  if (deger instanceof Timestamp) return { __zaman: deger.toMillis() }
  if (Array.isArray(deger)) return deger.map(jsonaCevir)
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).map(([k, v]) => [k, jsonaCevir(v)]))
  }
  return deger
}

/** Yedekten geri yüklerken Timestamp'leri geri kurar. */
function jsondanCevir(deger: unknown): unknown {
  if (deger && typeof deger === 'object' && !Array.isArray(deger)) {
    const nesne = deger as Record<string, unknown>
    if (typeof nesne.__zaman === 'number') return Timestamp.fromMillis(nesne.__zaman)
    return Object.fromEntries(Object.entries(nesne).map(([k, v]) => [k, jsondanCevir(v)]))
  }
  if (Array.isArray(deger)) return deger.map(jsondanCevir)
  return deger
}

async function koleksiyonuOku(
  yol: ReturnType<typeof katalogYolu>,
): Promise<YedekBelgesi[]> {
  const anlik = await getDocs(yol)
  return anlik.docs.map((d) => ({ id: d.id, veri: jsonaCevir(d.data()) as Record<string, unknown> }))
}

export async function yedekOlustur(uid: string): Promise<Yedek> {
  const [katalog, uretimler, siparisler, esanslar, ayarlarBelgesi, sayaclarBelgesi] = await Promise.all([
    koleksiyonuOku(katalogYolu(uid)),
    koleksiyonuOku(uretimYolu(uid)),
    koleksiyonuOku(siparisYolu(uid)),
    koleksiyonuOku(esansYolu(uid)),
    getDoc(ayarlarYolu(uid)),
    getDoc(sayaclarYolu(uid)),
  ])

  return {
    surum: 1,
    olusturma: new Date().toISOString(),
    katalog,
    uretimler,
    siparisler,
    esanslar,
    ayarlar: ayarlarBelgesi.exists()
      ? (jsonaCevir(ayarlarBelgesi.data()) as Record<string, unknown>)
      : null,
    sayaclar: sayaclarBelgesi.exists()
      ? (jsonaCevir(sayaclarBelgesi.data()) as Record<string, unknown>)
      : null,
  }
}

export async function yedekIndir(uid: string): Promise<void> {
  const yedek = await yedekOlustur(uid)
  dosyaIndir(
    `parfum-takip-yedek-${girdiTarihi(new Date())}.json`,
    JSON.stringify(yedek, null, 2),
    'application/json;charset=utf-8',
  )
}

export interface GeriYuklemeSonucu {
  katalog: number
  uretimler: number
  siparisler: number
  esanslar: number
}

/** Yedek dosyasını geri yükler (mevcut kayıtların üzerine yazar, eksikleri ekler). */
export async function yedegiGeriYukle(uid: string, jsonMetni: string): Promise<GeriYuklemeSonucu> {
  const yedek = JSON.parse(jsonMetni) as Yedek
  if (yedek.surum !== 1) throw new Error('Desteklenmeyen yedek sürümü.')

  const sonuc: GeriYuklemeSonucu = { katalog: 0, uretimler: 0, siparisler: 0, esanslar: 0 }

  const gruplar: Array<[keyof GeriYuklemeSonucu, YedekBelgesi[], ReturnType<typeof katalogYolu>]> = [
    ['katalog', yedek.katalog ?? [], katalogYolu(uid)],
    ['uretimler', yedek.uretimler ?? [], uretimYolu(uid)],
    ['siparisler', yedek.siparisler ?? [], siparisYolu(uid)],
    ['esanslar', yedek.esanslar ?? [], esansYolu(uid)],
  ]

  for (const [ad, belgeler, yol] of gruplar) {
    for (let i = 0; i < belgeler.length; i += 400) {
      const toplu = writeBatch(db)
      for (const belge of belgeler.slice(i, i + 400)) {
        toplu.set(doc(yol, belge.id), jsondanCevir(belge.veri) as Record<string, unknown>)
      }
      await toplu.commit()
      sonuc[ad] += Math.min(400, belgeler.length - i)
    }
  }

  const sonToplu = writeBatch(db)
  if (yedek.ayarlar) sonToplu.set(ayarlarYolu(uid), jsondanCevir(yedek.ayarlar) as Record<string, unknown>)
  if (yedek.sayaclar) sonToplu.set(sayaclarYolu(uid), jsondanCevir(yedek.sayaclar) as Record<string, unknown>)
  await sonToplu.commit()

  return sonuc
}
