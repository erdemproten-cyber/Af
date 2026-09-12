import { useEffect, useMemo, useState } from 'react'
import { useVeri, useUid } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { Alan, Buton, Girdi, MetinKutusu, Modal, Rozet, Secim, birlestir } from '../ui'
import ParfumSecici from '../ParfumSecici'
import { ArtiSimgesi, CopSimgesi, UyariSimgesi } from '../ui/simgeler'
import {
  SIPARIS_KAYNAKLARI,
  ODEME_YONTEMLERI,
  type OdemeYontemi,
  type Siparis,
  type SiparisKalemi,
  type SiparisKaynagi,
} from '../../types'
import { girdiTarihi, girdidenTarih, koddanNo, para, urunKodu } from '../../lib/format'
import { tarihe } from '../../lib/date'
import { siparisGuncelle, siparisOlustur, toplamHesapla } from '../../services/siparis'

interface KalemTaslagi extends SiparisKalemi {
  /** Kullanıcının alana yazdığı ham metin (numara veya kod olabilir). */
  arama: string
  /** Fiyat elle değiştirildiyse katalogdan gelen fiyat üzerine yazmaz. */
  fiyatElle: boolean
}

const BOS_KALEM: KalemTaslagi = {
  parfumNo: 0,
  kod: '',
  adet: 1,
  birimFiyat: 0,
  arama: '',
  fiyatElle: false,
}

interface Ozellikler {
  acik: boolean
  kapat: () => void
  /** Doluysa düzenleme modu. */
  duzenlenen?: Siparis | null
  /** Müşteri kartından "tekrar sipariş" için ön dolgu. */
  onDolguTelefon?: string
}

export default function SiparisFormu({ acik, kapat, duzenlenen, onDolguTelefon }: Ozellikler) {
  const uid = useUid()
  const { katalog, katalogHaritasi, ayarlar, stokHaritasi, siparisler } = useVeri()
  const toast = useToast()

  const [kaynak, setKaynak] = useState<SiparisKaynagi>('WhatsApp')
  const [ad, setAd] = useState('')
  const [telefon, setTelefon] = useState('')
  const [adres, setAdres] = useState('')
  const [musteriNotu, setMusteriNotu] = useState('')
  const [kalemler, setKalemler] = useState<KalemTaslagi[]>([{ ...BOS_KALEM }])
  const [siparisTarihi, setSiparisTarihi] = useState(girdiTarihi(new Date()))
  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi>('Havale/EFT')
  const [notlar, setNotlar] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  // Form açıldığında başlangıç değerlerini kur.
  useEffect(() => {
    if (!acik) return
    if (duzenlenen) {
      setKaynak(duzenlenen.kaynak)
      setAd(duzenlenen.musteri.ad)
      setTelefon(duzenlenen.musteri.telefon)
      setAdres(duzenlenen.musteri.adres)
      setMusteriNotu(duzenlenen.musteri.not)
      setKalemler(
        duzenlenen.urunler.length > 0
          ? duzenlenen.urunler.map((u) => ({ ...u, arama: String(u.parfumNo), fiyatElle: true }))
          : [{ ...BOS_KALEM }],
      )
      setSiparisTarihi(girdiTarihi(tarihe(duzenlenen.siparisTarihi) ?? new Date()))
      setOdemeYontemi(duzenlenen.odemeYontemi)
      setNotlar(duzenlenen.notlar)
    } else {
      const gecmis = onDolguTelefon
        ? siparisler.find(
            (s) => s.musteri.telefon.replace(/\D/g, '').slice(-10) === onDolguTelefon.replace(/\D/g, '').slice(-10),
          )
        : undefined
      setKaynak('WhatsApp')
      setAd(gecmis?.musteri.ad ?? '')
      setTelefon(onDolguTelefon ?? '')
      setAdres(gecmis?.musteri.adres ?? '')
      setMusteriNotu('')
      setKalemler([{ ...BOS_KALEM, birimFiyat: ayarlar.varsayilanFiyat }])
      setSiparisTarihi(girdiTarihi(new Date()))
      setOdemeYontemi('Havale/EFT')
      setNotlar('')
    }
    setHata(null)
  }, [acik, duzenlenen, onDolguTelefon, ayarlar.varsayilanFiyat, siparisler])

  const gecerliKalemler = useMemo(
    () => kalemler.filter((k) => k.parfumNo > 0 && k.adet > 0),
    [kalemler],
  )
  const toplam = toplamHesapla(gecerliKalemler)

  /** Yazılan numara katalogda varsa kod ve fiyatı otomatik doldurur. */
  function kalemGuncelle(indeks: number, degisiklik: Partial<KalemTaslagi>) {
    setKalemler((onceki) =>
      onceki.map((kalem, i) => (i === indeks ? { ...kalem, ...degisiklik } : kalem)),
    )
  }

  function aramaDegisti(indeks: number, metin: string) {
    const no = koddanNo(metin)
    const urun = no ? katalogHaritasi.get(no) : undefined
    kalemGuncelle(indeks, {
      arama: metin,
      parfumNo: no ?? 0,
      kod: urun?.kod ?? (no ? urunKodu(no) : ''),
      // Fiyat katalogdan otomatik gelir; kullanıcı elle değiştirdiyse dokunulmaz.
      ...(urun && !kalemler[indeks].fiyatElle
        ? { birimFiyat: urun.varsayilanFiyat || ayarlar.varsayilanFiyat }
        : {}),
    })
  }

  async function kaydet() {
    setHata(null)
    if (gecerliKalemler.length === 0) {
      setHata('En az bir ürün ekleyin (parfüm numarası ve adet).')
      return
    }
    if (!ad.trim() && !telefon.trim()) {
      setHata('Müşteri adı veya telefonundan en az biri gerekli.')
      return
    }

    setKaydediliyor(true)
    try {
      const musteri = { ad: ad.trim(), telefon: telefon.trim(), adres: adres.trim(), not: musteriNotu.trim() }
      const urunler: SiparisKalemi[] = gecerliKalemler.map(({ parfumNo, kod, adet, birimFiyat }) => ({
        parfumNo,
        kod,
        adet,
        birimFiyat,
      }))

      if (duzenlenen) {
        await siparisGuncelle(uid, duzenlenen.id, {
          kaynak,
          musteri,
          urunler,
          odemeYontemi,
          notlar: notlar.trim(),
          siparisTarihi: girdidenTarih(siparisTarihi),
        })
        toast.basari(`${duzenlenen.siparisNo} güncellendi.`)
      } else {
        const sonuc = await siparisOlustur(
          uid,
          {
            kaynak,
            musteri,
            urunler,
            durum: 'Yeni',
            siparisTarihi: girdidenTarih(siparisTarihi),
            odemeYontemi,
            notlar: notlar.trim(),
          },
          ayarlar.otomatikStokDusumu,
        )
        toast.basari(`${sonuc.siparisNo} oluşturuldu.`)
        if (sonuc.eksikler.length > 0) {
          toast.uyari(
            `Stok yetersiz: ${sonuc.eksikler
              .map((e) => `No ${e.parfumNo} (${e.adet} adet)`)
              .join(', ')}. Sipariş yine de kaydedildi.`,
          )
        }
      }
      kapat()
    } catch (e) {
      setHata((e as Error)?.message ?? 'Sipariş kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <Modal
      acik={acik}
      kapat={kapat}
      genis
      baslik={duzenlenen ? `${duzenlenen.siparisNo} düzenle` : 'Yeni sipariş'}
      aciklama={duzenlenen ? undefined : 'Ürün numarasını yazınca katalogdan otomatik tamamlanır.'}
      altBilgi={
        <>
          <div className="hidden flex-1 flex-col justify-center sm:flex">
            <span className="text-xs text-slate-500 dark:text-slate-400">Toplam</span>
            <span className="sayi text-lg font-bold text-slate-900 dark:text-slate-50">{para(toplam)}</span>
          </div>
          <Buton tur="ikincil" onClick={kapat} className="flex-1 sm:flex-none">
            Vazgeç
          </Buton>
          <Buton onClick={() => void kaydet()} yukleniyor={kaydediliyor} className="flex-1 sm:flex-none">
            {duzenlenen ? 'Kaydet' : 'Siparişi oluştur'}
          </Buton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Müşteri */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Müşteri</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Girdi etiket="Ad soyad" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ayşe Yılmaz" />
            <Girdi
              etiket="Telefon"
              type="tel"
              inputMode="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="0532 111 22 33"
            />
          </div>
          <MetinKutusu
            etiket="Adres"
            rows={2}
            value={adres}
            onChange={(e) => setAdres(e.target.value)}
            placeholder="Kargo adresi"
          />
          <Girdi
            etiket="Müşteri notu"
            value={musteriNotu}
            onChange={(e) => setMusteriNotu(e.target.value)}
            placeholder="Örn. kapıcıya bırakılabilir"
          />
        </section>

        {/* Ürünler */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ürünler</h3>

          <div className="flex flex-col gap-3">
            {kalemler.map((kalem, i) => {
              const stok = stokHaritasi.get(kalem.parfumNo)
              const hazir = stok?.hazirAdet ?? 0
              const yetersiz = kalem.parfumNo > 0 && hazir < kalem.adet
              return (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[2fr_1fr_1.2fr_auto]">
                    <Alan etiket={i === 0 ? 'Parfüm' : undefined} className="sm:col-span-1">
                      <ParfumSecici
                        katalog={katalog}
                        deger={kalem.arama}
                        degisti={(metin) => aramaDegisti(i, metin)}
                        secildi={(urun) =>
                          kalemGuncelle(i, {
                            arama: String(urun.no),
                            parfumNo: urun.no,
                            kod: urun.kod,
                            birimFiyat: urun.varsayilanFiyat || ayarlar.varsayilanFiyat,
                            fiyatElle: false,
                          })
                        }
                      />
                    </Alan>

                    <Girdi
                      etiket={i === 0 ? 'Adet' : undefined}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="sayi"
                      value={kalem.adet}
                      onChange={(e) => kalemGuncelle(i, { adet: Math.max(1, Number(e.target.value) || 1) })}
                    />

                    <Girdi
                      etiket={i === 0 ? 'Birim fiyat' : undefined}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className="sayi"
                      value={kalem.birimFiyat}
                      onChange={(e) =>
                        kalemGuncelle(i, { birimFiyat: Number(e.target.value) || 0, fiyatElle: true })
                      }
                    />

                    <div className={birlestir('flex items-end', i === 0 && 'sm:pb-0')}>
                      <button
                        type="button"
                        aria-label="Satırı sil"
                        disabled={kalemler.length === 1}
                        onClick={() => setKalemler((o) => o.filter((_, j) => j !== i))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10"
                      >
                        <CopSimgesi className="size-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {kalem.kod && <Rozet renk="notr">{kalem.kod}</Rozet>}
                    {kalem.parfumNo > 0 && (
                      <Rozet renk={yetersiz ? 'kirmizi' : 'yesil'}>
                        {yetersiz && <UyariSimgesi className="size-3.5" />}
                        Hazır stok: {hazir}
                        {(stok?.demlenenAdet ?? 0) > 0 && ` (+${stok?.demlenenAdet} demleniyor)`}
                      </Rozet>
                    )}
                    <span className="sayi ml-auto font-semibold text-slate-700 dark:text-slate-200">
                      {para(kalem.adet * kalem.birimFiyat)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <Buton
            tur="ikincil"
            onClick={() => setKalemler((o) => [...o, { ...BOS_KALEM, birimFiyat: ayarlar.varsayilanFiyat }])}
          >
            <ArtiSimgesi className="size-4" />
            Ürün ekle
          </Buton>

          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white dark:bg-marka-500 dark:text-slate-950">
            <span className="text-sm font-semibold">Toplam</span>
            <span className="sayi text-lg font-bold">{para(toplam)}</span>
          </div>
        </section>

        {/* Detaylar */}
        <section className="grid gap-3 sm:grid-cols-3">
          <Secim
            etiket="Kaynak"
            value={kaynak}
            onChange={(e) => setKaynak(e.target.value as SiparisKaynagi)}
            secenekler={SIPARIS_KAYNAKLARI.map((k) => ({ deger: k, etiket: k }))}
          />
          <Girdi
            etiket="Sipariş tarihi"
            type="date"
            value={siparisTarihi}
            onChange={(e) => setSiparisTarihi(e.target.value)}
          />
          <Secim
            etiket="Ödeme yöntemi"
            value={odemeYontemi}
            onChange={(e) => setOdemeYontemi(e.target.value as OdemeYontemi)}
            secenekler={ODEME_YONTEMLERI.map((o) => ({ deger: o, etiket: o }))}
          />
        </section>

        <MetinKutusu
          etiket="Sipariş notu"
          value={notlar}
          onChange={(e) => setNotlar(e.target.value)}
          placeholder="Örn. hediye paketi yapılacak"
        />

        {!duzenlenen && ayarlar.otomatikStokDusumu && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sipariş kaydedilince stok, demlenmesi tamamlanmış en eski partiden (FIFO) otomatik düşülür.
            Stok yetersizse sipariş yine oluşturulur, yalnızca uyarı verilir.
          </p>
        )}

        {hata && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {hata}
          </p>
        )}
      </div>
    </Modal>
  )
}
