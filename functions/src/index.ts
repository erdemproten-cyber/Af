/**
 * Shopier webhook'u (eski adıyla Otomatik Sipariş Bildirimi / OSB).
 *
 * Akış:
 *  1. Gelen istek doğrulanır (paylaşılan anahtar + varsa Shopier imzası).
 *  2. Ham gövde `users/{uid}/shopier_raw` altına loglanır (hata ayıklama için).
 *  3. Ürün kodundan (AF-012) parfüm numarası çözülür.
 *  4. `users/{uid}/siparisler` altına kaynak "Shopier", ödeme yöntemi "Shopier"
 *     olarak yazılır. Ödeme peşin alındığı için `odemeTarihi` doldurulur.
 *  5. Aynı `shopierSiparisId` ikinci kez gelirse yeni kayıt oluşturulmaz (idempotent).
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions'

initializeApp()
const db = getFirestore()

const SAHIP_UID = process.env.SAHIP_UID ?? ''
const WEBHOOK_ANAHTARI = process.env.SHOPIER_WEBHOOK_ANAHTARI ?? ''
const API_KEY = process.env.SHOPIER_API_KEY ?? ''
const API_SECRET = process.env.SHOPIER_API_SECRET ?? ''
const ON_EK = process.env.URUN_KODU_ON_EKI || 'AF'

interface SiparisKalemi {
  parfumNo: number
  kod: string
  adet: number
  birimFiyat: number
}

/** Zamanlama saldırılarına kapalı dize karşılaştırması. */
function esitMi(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

/** "AF-012" / "af12" / "12" → 12 */
function koddanNo(kod: unknown): number | null {
  const eslesme = String(kod ?? '').match(/(\d+)\s*$/)
  if (!eslesme) return null
  const no = Number(eslesme[1])
  return Number.isFinite(no) && no > 0 ? no : null
}

function sayiya(deger: unknown, varsayilan = 0): number {
  if (typeof deger === 'number' && Number.isFinite(deger)) return deger
  const metin = String(deger ?? '').replace(/[^\d,.-]/g, '')
  if (!metin) return varsayilan
  const sonVirgul = metin.lastIndexOf(',')
  const sonNokta = metin.lastIndexOf('.')
  const normal =
    sonVirgul > sonNokta ? metin.replace(/\./g, '').replace(',', '.') : metin.replace(/,/g, '')
  const sonuc = Number(normal)
  return Number.isFinite(sonuc) ? sonuc : varsayilan
}

function metne(deger: unknown): string {
  return deger === null || deger === undefined ? '' : String(deger)
}

/**
 * Shopier imzasını doğrular.
 * Klasik OSB bildirimlerinde `random_nr + platform_order_id` HMAC-SHA256 ile
 * API şifresi kullanılarak imzalanır ve base64 olarak `signature` alanında gelir.
 */
function imzaGecerliMi(govde: Record<string, unknown>): boolean {
  if (!API_KEY || !API_SECRET) return true // imza doğrulaması yapılandırılmamış
  const imza = metne(govde.signature)
  if (!imza) return false

  const rastgele = metne(govde.random_nr)
  const siparisId = metne(govde.platform_order_id ?? govde.orderid ?? govde.order_id)
  const beklenen = createHmac('sha256', API_SECRET).update(`${rastgele}${siparisId}`).digest('base64')

  return esitMi(imza, beklenen)
}

/** Shopier gövdesindeki ürün bilgisini tek tip kalemlere çevirir. */
function kalemleriCoz(govde: Record<string, unknown>, varsayilanFiyat: number): SiparisKalemi[] {
  const kalemler: SiparisKalemi[] = []

  // Bazı bildirimlerde ürünler JSON dizisi olarak gelir.
  const hamListe = govde.products ?? govde.urunler ?? govde.items
  let liste: unknown[] = []
  if (Array.isArray(hamListe)) {
    liste = hamListe
  } else if (typeof hamListe === 'string' && hamListe.trim().startsWith('[')) {
    try {
      liste = JSON.parse(hamListe) as unknown[]
    } catch {
      liste = []
    }
  }

  for (const ham of liste) {
    const urun = (ham ?? {}) as Record<string, unknown>
    const no = koddanNo(urun.productcode ?? urun.product_code ?? urun.kod ?? urun.name ?? urun.title)
    if (!no) continue
    const adet = Math.max(1, Math.trunc(sayiya(urun.quantity ?? urun.adet, 1)))
    const tutar = sayiya(urun.price ?? urun.total ?? urun.tutar, 0)
    kalemler.push({
      parfumNo: no,
      kod: `${ON_EK}-${String(no).padStart(3, '0')}`,
      adet,
      birimFiyat: tutar > 0 ? tutar / adet : varsayilanFiyat,
    })
  }

  if (kalemler.length > 0) return kalemler

  // Tek ürünlü klasik bildirim biçimi.
  const no = koddanNo(govde.productcode ?? govde.product_code ?? govde.productname ?? govde.product_name)
  if (no) {
    const adet = Math.max(1, Math.trunc(sayiya(govde.quantity ?? govde.adet, 1)))
    const tutar = sayiya(govde.total_order_value ?? govde.price ?? govde.tutar, 0)
    kalemler.push({
      parfumNo: no,
      kod: `${ON_EK}-${String(no).padStart(3, '0')}`,
      adet,
      birimFiyat: tutar > 0 ? tutar / adet : varsayilanFiyat,
    })
  }

  return kalemler
}

/** Yıl bazlı sipariş numarası sayacı — siparisOlustur ile aynı biçim. */
async function siparisNoAl(uid: string, yil: number): Promise<string> {
  const sayacRef = db.doc(`users/${uid}/meta/sayaclar`)
  const siradaki = await db.runTransaction(async (islem) => {
    const anlik = await islem.get(sayacRef)
    const mevcut = Number(anlik.data()?.[`siparis_${yil}`]) || 0
    islem.set(sayacRef, { [`siparis_${yil}`]: mevcut + 1 }, { merge: true })
    return mevcut + 1
  })
  return `SP-${yil}-${String(siradaki).padStart(4, '0')}`
}

export const shopierWebhook = onRequest(
  { region: 'europe-west1', cors: false, maxInstances: 5 },
  async (istek, yanit) => {
    if (istek.method !== 'POST') {
      yanit.status(405).send('Yalnızca POST kabul edilir.')
      return
    }

    if (!SAHIP_UID) {
      logger.error('SAHIP_UID ortam değişkeni tanımlı değil.')
      yanit.status(500).send('Sunucu yapılandırması eksik.')
      return
    }

    // 1) Paylaşılan anahtar doğrulaması
    const gelenAnahtar =
      metne(istek.query.anahtar) || metne(istek.get('x-webhook-anahtari')) || ''
    if (!WEBHOOK_ANAHTARI || !esitMi(gelenAnahtar, WEBHOOK_ANAHTARI)) {
      logger.warn('Geçersiz webhook anahtarı ile istek geldi.')
      yanit.status(401).send('Yetkisiz.')
      return
    }

    const govde = (istek.body ?? {}) as Record<string, unknown>

    // 2) Ham gövdeyi logla (hata ayıklama) — imza geçersiz olsa bile kaydedilir.
    const hamRef = db.collection(`users/${SAHIP_UID}/shopier_raw`).doc()
    await hamRef.set({
      govde,
      basliklar: {
        'content-type': istek.get('content-type') ?? '',
        'user-agent': istek.get('user-agent') ?? '',
      },
      alinma: FieldValue.serverTimestamp(),
    })

    // 3) İmza doğrulaması
    if (!imzaGecerliMi(govde)) {
      logger.warn('Shopier imzası doğrulanamadı.', { hamId: hamRef.id })
      await hamRef.set({ hata: 'imza-gecersiz' }, { merge: true })
      yanit.status(401).send('İmza geçersiz.')
      return
    }

    const shopierSiparisId = metne(
      govde.platform_order_id ?? govde.orderid ?? govde.order_id ?? govde.siparis_id,
    ).trim()

    if (!shopierSiparisId) {
      await hamRef.set({ hata: 'siparis-id-yok' }, { merge: true })
      yanit.status(400).send('Sipariş kimliği bulunamadı.')
      return
    }

    // 4) Idempotanlık: aynı sipariş ikinci kez gelirse yeni kayıt oluşturma.
    const mevcut = await db
      .collection(`users/${SAHIP_UID}/siparisler`)
      .where('shopierSiparisId', '==', shopierSiparisId)
      .limit(1)
      .get()

    if (!mevcut.empty) {
      logger.info('Shopier siparişi zaten kayıtlı, atlandı.', { shopierSiparisId })
      await hamRef.set({ sonuc: 'zaten-kayitli', siparisId: mevcut.docs[0].id }, { merge: true })
      yanit.status(200).json({ durum: 'zaten-kayitli', siparisId: mevcut.docs[0].id })
      return
    }

    // 5) Siparişi yaz
    const ayarlar = await db.doc(`users/${SAHIP_UID}/meta/ayarlar`).get()
    const varsayilanFiyat = Number(ayarlar.data()?.varsayilanFiyat) || 0

    const urunler = kalemleriCoz(govde, varsayilanFiyat)
    if (urunler.length === 0) {
      logger.warn('Ürün kodundan parfüm numarası çözülemedi.', { shopierSiparisId })
      await hamRef.set({ hata: 'urun-cozulemedi' }, { merge: true })
      yanit.status(200).json({ durum: 'urun-cozulemedi', hamId: hamRef.id })
      return
    }

    const toplamTutar =
      sayiya(govde.total_order_value ?? govde.total ?? govde.tutar, 0) ||
      urunler.reduce((t, u) => t + u.adet * u.birimFiyat, 0)

    const simdi = new Date()
    const siparisNo = await siparisNoAl(SAHIP_UID, simdi.getFullYear())

    const siparisRef = db.collection(`users/${SAHIP_UID}/siparisler`).doc()
    await siparisRef.set({
      siparisNo,
      kaynak: 'Shopier',
      shopierSiparisId,
      musteri: {
        ad: [metne(govde.buyer_name ?? govde.name), metne(govde.buyer_surname ?? govde.surname)]
          .filter(Boolean)
          .join(' ')
          .trim(),
        telefon: metne(govde.buyer_phone ?? govde.phone ?? govde.gsm),
        adres: [
          metne(govde.buyer_address ?? govde.address),
          metne(govde.buyer_city ?? govde.city),
        ]
          .filter(Boolean)
          .join(' '),
        not: metne(govde.buyer_email ?? govde.email),
      },
      urunler,
      toplamTutar,
      // Shopier ödemesi peşin alınır; sipariş yine de "Yeni" olarak iş akışına girer.
      durum: 'Yeni',
      siparisTarihi: Timestamp.fromDate(simdi),
      kargoTarihi: null,
      kargoFirmasi: '',
      kargoTakipNo: '',
      odemeTarihi: Timestamp.fromDate(simdi),
      odemeYontemi: 'Shopier',
      // Ödeme alınmış olsa da sipariş hazırlanıp kargolanacağı için arşive inmez.
      arsiv: false,
      notlar: 'Shopier webhook ile otomatik oluşturuldu.',
      stokDusumleri: [],
      olusturmaTarihi: FieldValue.serverTimestamp(),
    })

    await hamRef.set({ sonuc: 'olusturuldu', siparisId: siparisRef.id, siparisNo }, { merge: true })
    logger.info('Shopier siparişi oluşturuldu.', { siparisNo, shopierSiparisId })

    yanit.status(200).json({ durum: 'olusturuldu', siparisNo })
  },
)

/**
 * Haftalık otomatik yedek.
 *
 * Her pazar 03:00'te (Europe/Istanbul) tüm koleksiyonları tek bir JSON dosyası
 * olarak projenin varsayılan Cloud Storage paketine yazar:
 *   yedekler/parfum-takip-YYYY-AA-GG.json
 *
 * Uygulamadaki "Yedek indir" düğmesi bundan bağımsız çalışır; bu işlev yalnızca
 * ek güvence içindir. Devre dışı bırakmak için bu bloğu silip yeniden dağıtın.
 */
export const haftalikYedek = onSchedule(
  { schedule: 'every sunday 03:00', timeZone: 'Europe/Istanbul', region: 'europe-west1' },
  async () => {
    if (!SAHIP_UID) {
      logger.error('SAHIP_UID tanımlı değil; yedek alınamadı.')
      return
    }

    const koleksiyonlar = ['katalog', 'uretimler', 'siparisler', 'esanslar'] as const
    const yedek: Record<string, unknown> = {
      surum: 1,
      olusturma: new Date().toISOString(),
    }

    for (const ad of koleksiyonlar) {
      const anlik = await db.collection(`users/${SAHIP_UID}/${ad}`).get()
      yedek[ad] = anlik.docs.map((d) => ({ id: d.id, veri: d.data() }))
    }

    const ayarlar = await db.doc(`users/${SAHIP_UID}/meta/ayarlar`).get()
    const sayaclar = await db.doc(`users/${SAHIP_UID}/meta/sayaclar`).get()
    yedek.ayarlar = ayarlar.exists ? ayarlar.data() : null
    yedek.sayaclar = sayaclar.exists ? sayaclar.data() : null

    const gun = new Date().toISOString().slice(0, 10)
    const dosya = getStorage().bucket().file(`yedekler/parfum-takip-${gun}.json`)
    await dosya.save(JSON.stringify(yedek), { contentType: 'application/json' })

    logger.info('Haftalık yedek yazıldı.', { dosya: dosya.name })
  },
)
