import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUid, useVeri } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Buton, Girdi, Kart, Rozet, Secim, birlestir } from '../components/ui'
import { OnayKutusu } from '../components/ui/Onay'
import { ArtiSimgesi, CikisSimgesi, CopSimgesi, IndirSimgesi, YuklemeSimgesi } from '../components/ui/simgeler'
import { ayarlariKaydet } from '../services/ayarlar'
import {
  katalogCsvUret,
  katalogIceAktar,
  katalogIskeletOlustur,
  katalogTemizle,
} from '../services/katalog'
import { shopierCsvIceAktar } from '../services/shopier'
import { yedegiGeriYukle, yedekIndir } from '../services/yedek'
import { dosyaIndir, csvYaz } from '../lib/csv'
import { girdiTarihi } from '../lib/format'
import type { Ayarlar as AyarlarTipi } from '../types'

function Bolum({
  baslik,
  aciklama,
  children,
}: {
  baslik: string
  aciklama?: string
  children: React.ReactNode
}) {
  return (
    <Kart className="p-4">
      <h2 className="font-bold text-slate-900 dark:text-slate-50">{baslik}</h2>
      {aciklama && <p className="mt-0.5 mb-3 text-sm text-slate-500 dark:text-slate-400">{aciklama}</p>}
      <div className={birlestir('flex flex-col gap-3', !aciklama && 'mt-3')}>{children}</div>
    </Kart>
  )
}

export default function Ayarlar() {
  const uid = useUid()
  const { cikisYap, kullanici } = useAuth()
  const { ayarlar, katalog, siparisler, uretimler } = useVeri()
  const toast = useToast()

  const katalogDosya = useRef<HTMLInputElement>(null)
  const shopierDosya = useRef<HTMLInputElement>(null)
  const yedekDosya = useRef<HTMLInputElement>(null)

  const [yeniKargo, setYeniKargo] = useState('')
  const [iskeletAcik, setIskeletAcik] = useState(false)
  const [temizleAcik, setTemizleAcik] = useState(false)
  const [mesgul, setMesgul] = useState<string | null>(null)

  async function kaydet(degisiklik: Partial<AyarlarTipi>) {
    try {
      await ayarlariKaydet(uid, degisiklik)
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'Ayar kaydedilemedi.')
    }
  }

  async function dosyaOku(dosya: File): Promise<string> {
    return await dosya.text()
  }

  async function katalogYukle(dosya: File) {
    setMesgul('katalog')
    try {
      const sonuc = await katalogIceAktar(uid, await dosyaOku(dosya), ayarlar.varsayilanFiyat)
      if (sonuc.eklenen > 0) toast.basari(`${sonuc.eklenen} ürün içe aktarıldı.`)
      if (sonuc.atlanan > 0) toast.uyari(`${sonuc.atlanan} satır atlandı. ${sonuc.hatalar[0] ?? ''}`)
      if (sonuc.eklenen === 0 && sonuc.atlanan === 0) toast.hata('Hiçbir satır okunamadı.')
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'İçe aktarılamadı.')
    } finally {
      setMesgul(null)
    }
  }

  async function shopierYukle(dosya: File) {
    setMesgul('shopier')
    try {
      const sonuc = await shopierCsvIceAktar(
        uid,
        await dosyaOku(dosya),
        ayarlar.varsayilanFiyat,
        ayarlar.otomatikStokDusumu,
      )
      toast.basari(
        `${sonuc.eklenen} sipariş eklendi. ${sonuc.mevcut} sipariş zaten kayıtlıydı, ${sonuc.atlanan} satır atlandı.`,
      )
      if (sonuc.hatalar.length > 0) toast.uyari(sonuc.hatalar[0])
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'İçe aktarılamadı.')
    } finally {
      setMesgul(null)
    }
  }

  async function yedekYukle(dosya: File) {
    setMesgul('yedek')
    try {
      const sonuc = await yedegiGeriYukle(uid, await dosyaOku(dosya))
      toast.basari(
        `Geri yüklendi: ${sonuc.katalog} katalog, ${sonuc.uretimler} üretim, ${sonuc.siparisler} sipariş.`,
      )
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'Yedek geri yüklenemedi.')
    } finally {
      setMesgul(null)
    }
  }

  function sablonIndir() {
    dosyaIndir(
      'katalog-sablonu.csv',
      csvYaz(
        ['no', 'kod', 'cinsiyet', 'aciklama', 'varsayilanFiyat', 'aktif'],
        [
          [1, 'AF-001', 'Kadın', 'Çiçeksi - yasemin, gül', 2500, 'Evet'],
          [2, 'AF-002', 'Erkek', 'Odunsu - sedir, vetiver', 2500, 'Evet'],
          [3, 'AF-003', 'Unisex', 'Oryantal - amber, vanilya', 2750, 'Evet'],
        ],
      ),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Ayarlar</h1>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{kullanici?.email}</p>
      </header>

      {/* Varsayılanlar */}
      <Bolum baslik="Varsayılanlar" aciklama="Yeni kayıtlarda otomatik kullanılan değerler.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Girdi
            etiket="Demlenme süresi (gün)"
            type="number"
            min={0}
            className="sayi"
            defaultValue={ayarlar.varsayilanDemlenmeGun}
            onBlur={(e) => void kaydet({ varsayilanDemlenmeGun: Number(e.target.value) || 30 })}
          />
          <Girdi
            etiket="Varsayılan satış fiyatı (₺)"
            type="number"
            min={0}
            className="sayi"
            defaultValue={ayarlar.varsayilanFiyat}
            onBlur={(e) => void kaydet({ varsayilanFiyat: Number(e.target.value) || 0 })}
          />
          <Girdi
            etiket="Varsayılan hacim (ml)"
            type="number"
            min={1}
            className="sayi"
            defaultValue={ayarlar.varsayilanHacimMl}
            onBlur={(e) => void kaydet({ varsayilanHacimMl: Number(e.target.value) || 100 })}
          />
          <Girdi
            etiket="Düşük stok eşiği (adet)"
            type="number"
            min={0}
            className="sayi"
            defaultValue={ayarlar.dusukStokEsigi}
            onBlur={(e) => void kaydet({ dusukStokEsigi: Number(e.target.value) || 0 })}
            ipucu="Hazır stok bu sayının altına inince panelde uyarılır."
          />
        </div>

        <Secim
          etiket="Tema"
          value={ayarlar.tema}
          onChange={(e) => void kaydet({ tema: e.target.value as AyarlarTipi['tema'] })}
          secenekler={[
            { deger: 'sistem', etiket: 'Sistem ayarını kullan' },
            { deger: 'acik', etiket: 'Açık' },
            { deger: 'koyu', etiket: 'Karanlık' },
          ]}
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="checkbox"
            checked={ayarlar.otomatikStokDusumu}
            onChange={(e) => void kaydet({ otomatikStokDusumu: e.target.checked })}
            className="mt-0.5 size-5 accent-marka-500"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Siparişte stok otomatik düşsün
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Demlenmesi tamamlanmış en eski partiden (FIFO) düşülür. Kapatırsanız stoğu elle
              yönetirsiniz.
            </span>
          </span>
        </label>
      </Bolum>

      {/* Kargo firmaları */}
      <Bolum baslik="Kargo firmaları" aciklama="Kargola ekranındaki listede görünür.">
        <div className="flex flex-wrap gap-2">
          {ayarlar.kargoFirmalari.map((firma) => (
            <span
              key={firma}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1.5 pr-1.5 pl-3 text-sm font-medium dark:bg-slate-800"
            >
              {firma}
              <button
                type="button"
                aria-label={`${firma} kaldır`}
                onClick={() =>
                  void kaydet({ kargoFirmalari: ayarlar.kargoFirmalari.filter((k) => k !== firma) })
                }
                className="rounded-full p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20"
              >
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={yeniKargo}
            onChange={(e) => setYeniKargo(e.target.value)}
            placeholder="Kargo firması ekle"
            className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Buton
            onClick={() => {
              const ad = yeniKargo.trim()
              if (!ad || ayarlar.kargoFirmalari.includes(ad)) return
              void kaydet({ kargoFirmalari: [...ayarlar.kargoFirmalari, ad] })
              setYeniKargo('')
            }}
          >
            <ArtiSimgesi className="size-5" />
            Ekle
          </Buton>
        </div>
      </Bolum>

      {/* Katalog */}
      <Bolum
        baslik="Katalog"
        aciklama={`${katalog.length} parfüm kayıtlı. CSV ile toplu yükleyebilir veya 1–500 arası boş iskelet oluşturabilirsiniz.`}
      >
        <input
          ref={katalogDosya}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const dosya = e.target.files?.[0]
            if (dosya) void katalogYukle(dosya)
            e.target.value = ''
          }}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Buton
            tur="ikincil"
            onClick={() => katalogDosya.current?.click()}
            yukleniyor={mesgul === 'katalog'}
          >
            <YuklemeSimgesi className="size-5" />
            CSV içe aktar
          </Buton>
          <Buton
            tur="ikincil"
            disabled={katalog.length === 0}
            onClick={() => dosyaIndir(`katalog-${girdiTarihi(new Date())}.csv`, katalogCsvUret(katalog))}
          >
            <IndirSimgesi className="size-5" />
            CSV dışa aktar
          </Buton>
          <Buton tur="sessiz" onClick={sablonIndir}>
            Örnek şablonu indir
          </Buton>
          <Buton tur="sessiz" onClick={() => setIskeletAcik(true)}>
            1–500 iskeleti oluştur
          </Buton>
        </div>

        <Buton tur="tehlike" boy="sm" onClick={() => setTemizleAcik(true)} disabled={katalog.length === 0}>
          <CopSimgesi className="size-4" />
          Katalogu tamamen sil
        </Buton>
      </Bolum>

      {/* Shopier */}
      <Bolum
        baslik="Shopier"
        aciklama="Webhook kurulumu README'de anlatılır. Webhook çalışmıyorsa panelden indirdiğiniz sipariş dökümünü buradan yükleyebilirsiniz."
      >
        <input
          ref={shopierDosya}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const dosya = e.target.files?.[0]
            if (dosya) void shopierYukle(dosya)
            e.target.value = ''
          }}
        />
        <Buton
          tur="ikincil"
          onClick={() => shopierDosya.current?.click()}
          yukleniyor={mesgul === 'shopier'}
        >
          <YuklemeSimgesi className="size-5" />
          Shopier CSV içe aktar
        </Buton>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aynı Shopier sipariş numarası ikinci kez yüklenirse yeni kayıt oluşturulmaz.
        </p>
      </Bolum>

      {/* Yedek */}
      <Bolum
        baslik="Yedekleme"
        aciklama={`${katalog.length} katalog, ${uretimler.length} üretim, ${siparisler.length} sipariş kaydı.`}
      >
        <input
          ref={yedekDosya}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const dosya = e.target.files?.[0]
            if (dosya) void yedekYukle(dosya)
            e.target.value = ''
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Buton
            tur="ikincil"
            onClick={async () => {
              setMesgul('indir')
              try {
                await yedekIndir(uid)
                toast.basari('Yedek indirildi.')
              } catch (e) {
                toast.hata((e as Error)?.message ?? 'Yedek alınamadı.')
              } finally {
                setMesgul(null)
              }
            }}
            yukleniyor={mesgul === 'indir'}
          >
            <IndirSimgesi className="size-5" />
            Yedek indir (JSON)
          </Buton>
          <Buton tur="ikincil" onClick={() => yedekDosya.current?.click()} yukleniyor={mesgul === 'yedek'}>
            <YuklemeSimgesi className="size-5" />
            Yedekten geri yükle
          </Buton>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Geri yükleme mevcut kayıtların üzerine yazar. Haftalık otomatik yedek için README'deki Cloud
          Scheduler adımına bakın.
        </p>
      </Bolum>

      <Buton tur="ikincil" tamGenislik onClick={() => void cikisYap()}>
        <CikisSimgesi className="size-5" />
        Çıkış yap
      </Buton>

      <p className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Parfüm Takip · <Rozet renk="notr">v1.0</Rozet>
      </p>

      <OnayKutusu
        acik={iskeletAcik}
        kapat={() => setIskeletAcik(false)}
        baslik="1–500 katalog iskeleti"
        onayMetni="Oluştur"
        mesaj="1'den 500'e kadar boş katalog kaydı oluşturulacak (AF-001 … AF-500). Mevcut kayıtların açıklama ve fiyatları korunur. Bu işlem biraz sürebilir."
        onayla={async () => {
          setMesgul('iskelet')
          try {
            const adet = await katalogIskeletOlustur(uid, 1, 500, ayarlar.varsayilanFiyat)
            toast.basari(`${adet} katalog kaydı hazırlandı.`)
          } finally {
            setMesgul(null)
          }
        }}
      />

      <OnayKutusu
        acik={temizleAcik}
        kapat={() => setTemizleAcik(false)}
        baslik="Katalogu sil"
        tehlikeli
        onayMetni="Hepsini sil"
        mesaj={`${katalog.length} katalog kaydı kalıcı olarak silinecek. Sipariş ve üretim kayıtları etkilenmez. Bu işlem geri alınamaz.`}
        onayla={async () => {
          const adet = await katalogTemizle(uid)
          toast.basari(`${adet} kayıt silindi.`)
        }}
      />
    </div>
  )
}
