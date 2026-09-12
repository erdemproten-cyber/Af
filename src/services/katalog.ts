import { deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { katalogYolu } from './yollar'
import type { Cinsiyet, KatalogUrun } from '../types'
import { csvNesneler, csvYaz, sayiyaCevir } from '../lib/csv'
import { urunKodu } from '../lib/format'

/** Belge kimliği olarak parfüm numarasını kullanırız: aynı numara iki kez eklenemez. */
const belgeId = (no: number) => String(no).padStart(3, '0')

export type KatalogGirdi = Omit<KatalogUrun, 'id'>

export async function katalogKaydet(uid: string, urun: KatalogGirdi): Promise<void> {
  await setDoc(
    doc(katalogYolu(uid), belgeId(urun.no)),
    { ...urun, guncellemeTarihi: serverTimestamp() },
    { merge: true },
  )
}

export async function katalogSil(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(katalogYolu(uid), id))
}

export interface IceAktarmaSonucu {
  eklenen: number
  atlanan: number
  hatalar: string[]
}

/**
 * CSV metnini katalog koleksiyonuna toplu yazar.
 * Beklenen başlıklar: no, kod, cinsiyet, aciklama, varsayilanFiyat, aktif
 * (yalnızca `no` zorunlu; diğerleri boş bırakılabilir).
 */
export async function katalogIceAktar(
  uid: string,
  csvMetni: string,
  varsayilanFiyat: number,
): Promise<IceAktarmaSonucu> {
  const { satirlar } = csvNesneler(csvMetni)
  const sonuc: IceAktarmaSonucu = { eklenen: 0, atlanan: 0, hatalar: [] }
  if (satirlar.length === 0) {
    sonuc.hatalar.push('Dosyada okunabilir satır bulunamadı.')
    return sonuc
  }

  const basligiBul = (satir: Record<string, string>, adaylar: string[]): string => {
    for (const anahtar of Object.keys(satir)) {
      const k = anahtar.toLocaleLowerCase('tr-TR').replace(/[\s_-]/g, '')
      if (adaylar.includes(k)) return satir[anahtar]
    }
    return ''
  }

  const hazir: KatalogGirdi[] = []
  satirlar.forEach((satir, i) => {
    const no = Math.trunc(sayiyaCevir(basligiBul(satir, ['no', 'numara', 'parfumno', 'parfümno'])))
    if (!no || no < 1) {
      sonuc.atlanan++
      if (sonuc.hatalar.length < 10) sonuc.hatalar.push(`${i + 2}. satır: geçerli numara yok.`)
      return
    }
    const cinsiyetHam = basligiBul(satir, ['cinsiyet', 'tur', 'tür']).toLocaleLowerCase('tr-TR')
    const cinsiyet: Cinsiyet = cinsiyetHam.startsWith('k')
      ? 'Kadın'
      : cinsiyetHam.startsWith('e')
        ? 'Erkek'
        : 'Unisex'
    const fiyat = sayiyaCevir(basligiBul(satir, ['varsayilanfiyat', 'fiyat', 'satisfiyati', 'satışfiyatı']))
    const aktifHam = basligiBul(satir, ['aktif', 'durum']).toLocaleLowerCase('tr-TR')

    hazir.push({
      no,
      kod: basligiBul(satir, ['kod', 'urunkodu', 'ürünkodu', 'stokkodu']) || urunKodu(no),
      cinsiyet,
      aciklama: basligiBul(satir, ['aciklama', 'açıklama', 'notlar', 'kokuailesi', 'notalar']),
      varsayilanFiyat: fiyat > 0 ? fiyat : varsayilanFiyat,
      aktif: !['hayır', 'hayir', 'false', '0', 'pasif'].includes(aktifHam),
    })
  })

  // Firestore toplu yazma sınırı 500 işlem.
  for (let i = 0; i < hazir.length; i += 400) {
    const toplu = writeBatch(db)
    for (const urun of hazir.slice(i, i + 400)) {
      toplu.set(doc(katalogYolu(uid), belgeId(urun.no)), urun, { merge: true })
    }
    await toplu.commit()
    sonuc.eklenen += Math.min(400, hazir.length - i)
  }

  return sonuc
}

export function katalogCsvUret(urunler: KatalogUrun[]): string {
  return csvYaz(
    ['no', 'kod', 'cinsiyet', 'aciklama', 'varsayilanFiyat', 'aktif'],
    [...urunler]
      .sort((a, b) => a.no - b.no)
      .map((u) => [u.no, u.kod, u.cinsiyet, u.aciklama, u.varsayilanFiyat, u.aktif ? 'Evet' : 'Hayır']),
  )
}

/** 1–500 arası boş katalog iskeleti oluşturur (sonra tek tek düzenlenebilir). */
export async function katalogIskeletOlustur(
  uid: string,
  baslangic: number,
  bitis: number,
  varsayilanFiyat: number,
): Promise<number> {
  let yazilan = 0
  for (let no = baslangic; no <= bitis; no += 400) {
    const toplu = writeBatch(db)
    const son = Math.min(no + 399, bitis)
    for (let i = no; i <= son; i++) {
      toplu.set(
        doc(katalogYolu(uid), belgeId(i)),
        { no: i, kod: urunKodu(i), cinsiyet: 'Unisex', aciklama: '', varsayilanFiyat, aktif: true },
        { merge: true },
      )
      yazilan++
    }
    await toplu.commit()
  }
  return yazilan
}

export async function katalogTemizle(uid: string): Promise<number> {
  const anlik = await getDocs(katalogYolu(uid))
  let silinen = 0
  for (let i = 0; i < anlik.docs.length; i += 400) {
    const toplu = writeBatch(db)
    for (const belge of anlik.docs.slice(i, i + 400)) toplu.delete(belge.ref)
    await toplu.commit()
    silinen += Math.min(400, anlik.docs.length - i)
  }
  return silinen
}
