import { useEffect, useState } from 'react'
import { Alan, Buton, Girdi, Kart, MetinKutusu, Modal, Rozet } from '../ui'
import ParfumSecici from '../ParfumSecici'
import { ArtiSimgesi, CopSimgesi } from '../ui/simgeler'
import { useUid, useVeri } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { uretimEkle, uretimGuncelle } from '../../services/uretim'
import type { Esans, Uretim } from '../../types'
import { girdiTarihi, girdidenTarih, koddanNo, para, tarih } from '../../lib/format'
import { gunEkle, tarihe } from '../../lib/date'

interface Ozellikler {
  acik: boolean
  kapat: () => void
  duzenlenen?: Uretim | null
  /** Kart üzerinden "bu numaradan üret" ile açıldığında ön dolgu. */
  onDolguNo?: number
}

const BOS_ESANS: Esans = { ad: '', oran: '', tedarikci: '' }

export default function UretimFormu({ acik, kapat, duzenlenen, onDolguNo }: Ozellikler) {
  const uid = useUid()
  const { katalog, katalogHaritasi, ayarlar, esanslar: esansSozlugu } = useVeri()
  const toast = useToast()

  const [arama, setArama] = useState('')
  const [parfumNo, setParfumNo] = useState(0)
  const [hacimMl, setHacimMl] = useState(ayarlar.varsayilanHacimMl)
  const [adet, setAdet] = useState(6)
  const [kalanAdet, setKalanAdet] = useState<number | null>(null)
  const [uretimTarihi, setUretimTarihi] = useState(girdiTarihi(new Date()))
  const [demlenmeGun, setDemlenmeGun] = useState(ayarlar.varsayilanDemlenmeGun)
  const [esanslar, setEsanslar] = useState<Esans[]>([])
  const [notlar, setNotlar] = useState('')
  const [maliyet, setMaliyet] = useState(0)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    if (!acik) return
    if (duzenlenen) {
      setArama(String(duzenlenen.parfumNo))
      setParfumNo(duzenlenen.parfumNo)
      setHacimMl(duzenlenen.hacimMl)
      setAdet(duzenlenen.adet)
      setKalanAdet(duzenlenen.kalanAdet)
      setUretimTarihi(girdiTarihi(tarihe(duzenlenen.uretimTarihi) ?? new Date()))
      setDemlenmeGun(duzenlenen.demlenmeGun)
      setEsanslar(duzenlenen.esanslar.length > 0 ? duzenlenen.esanslar : [])
      setNotlar(duzenlenen.notlar)
      setMaliyet(duzenlenen.maliyet)
    } else {
      setArama(onDolguNo ? String(onDolguNo) : '')
      setParfumNo(onDolguNo ?? 0)
      setHacimMl(ayarlar.varsayilanHacimMl)
      setAdet(6)
      setKalanAdet(null)
      setUretimTarihi(girdiTarihi(new Date()))
      setDemlenmeGun(ayarlar.varsayilanDemlenmeGun)
      setEsanslar([])
      setNotlar('')
      setMaliyet(0)
    }
    setHata(null)
  }, [acik, duzenlenen, onDolguNo, ayarlar])

  const urun = katalogHaritasi.get(parfumNo)
  const bitisTarihi = gunEkle(girdidenTarih(uretimTarihi), demlenmeGun)
  const partiBasiMaliyet = adet > 0 && maliyet > 0 ? maliyet / adet : 0

  async function kaydet() {
    setHata(null)
    if (!parfumNo || parfumNo < 1) {
      setHata('Geçerli bir parfüm numarası girin.')
      return
    }
    if (adet < 1) {
      setHata('Adet en az 1 olmalı.')
      return
    }

    setKaydediliyor(true)
    try {
      const girdi = {
        parfumNo,
        hacimMl,
        adet,
        kalanAdet: duzenlenen ? Math.min(adet, kalanAdet ?? adet) : adet,
        uretimTarihi: girdidenTarih(uretimTarihi),
        demlenmeGun,
        esanslar,
        notlar: notlar.trim(),
        maliyet,
      }
      if (duzenlenen) {
        await uretimGuncelle(uid, duzenlenen.id, girdi)
        toast.basari('Üretim partisi güncellendi.')
      } else {
        await uretimEkle(uid, girdi)
        toast.basari(`No ${parfumNo} için ${adet} şişelik parti eklendi.`)
      }
      kapat()
    } catch (e) {
      setHata((e as Error)?.message ?? 'Kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <Modal
      acik={acik}
      kapat={kapat}
      genis
      baslik={duzenlenen ? 'Üretim partisini düzenle' : 'Yeni üretim ekle'}
      aciklama="Esans bilgileri zorunlu değildir, boş bırakabilirsiniz."
      altBilgi={
        <>
          <Buton tur="ikincil" tamGenislik onClick={kapat}>
            Vazgeç
          </Buton>
          <Buton tamGenislik yukleniyor={kaydediliyor} onClick={() => void kaydet()}>
            {duzenlenen ? 'Kaydet' : 'Partiyi ekle'}
          </Buton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Alan etiket="Parfüm numarası" ipucu={urun ? `${urun.kod} · ${urun.cinsiyet}` : 'Katalogda yoksa da girebilirsiniz'}>
            <ParfumSecici
              katalog={katalog}
              deger={arama}
              degisti={(metin) => {
                setArama(metin)
                setParfumNo(koddanNo(metin) ?? 0)
              }}
              secildi={(secilen) => {
                setArama(String(secilen.no))
                setParfumNo(secilen.no)
              }}
            />
          </Alan>

          <Girdi
            etiket="Hacim (ml)"
            type="number"
            min={1}
            className="sayi"
            value={hacimMl}
            onChange={(e) => setHacimMl(Number(e.target.value) || 0)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Girdi
            etiket="Üretilen adet"
            type="number"
            min={1}
            inputMode="numeric"
            className="sayi"
            value={adet}
            onChange={(e) => setAdet(Math.max(1, Number(e.target.value) || 1))}
          />
          <Girdi
            etiket="Üretim tarihi"
            type="date"
            value={uretimTarihi}
            onChange={(e) => setUretimTarihi(e.target.value)}
          />
          <Girdi
            etiket="Demlenme (gün)"
            type="number"
            min={0}
            className="sayi"
            value={demlenmeGun}
            onChange={(e) => setDemlenmeGun(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        {duzenlenen && (
          <Girdi
            etiket="Kalan adet"
            type="number"
            min={0}
            max={adet}
            className="sayi"
            value={kalanAdet ?? adet}
            onChange={(e) => setKalanAdet(Math.max(0, Number(e.target.value) || 0))}
            ipucu="Fire, numune veya sayım farkı için elle düzeltebilirsiniz."
          />
        )}

        <Kart className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">Demlenme bitiş tarihi</span>
          <Rozet renk="mavi">{tarih(bitisTarihi)}</Rozet>
        </Kart>

        {/* Esanslar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Esanslar <span className="font-normal text-slate-400">(opsiyonel)</span>
            </h3>
            <Buton tur="sessiz" boy="sm" onClick={() => setEsanslar((o) => [...o, { ...BOS_ESANS }])}>
              <ArtiSimgesi className="size-4" />
              Esans ekle
            </Buton>
          </div>

          {esanslar.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Esans bilgisi girmeden de partiyi kaydedebilirsiniz.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {esanslar.map((esans, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[2fr_1fr_1.5fr_auto]">
                  <input
                    list="esans-onerileri"
                    value={esans.ad}
                    placeholder="Esans adı"
                    onChange={(e) =>
                      setEsanslar((o) => o.map((k, j) => (j === i ? { ...k, ad: e.target.value } : k)))
                    }
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <input
                    value={esans.oran}
                    placeholder="Oran (%8)"
                    onChange={(e) =>
                      setEsanslar((o) => o.map((k, j) => (j === i ? { ...k, oran: e.target.value } : k)))
                    }
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <input
                    value={esans.tedarikci}
                    placeholder="Tedarikçi"
                    onChange={(e) =>
                      setEsanslar((o) => o.map((k, j) => (j === i ? { ...k, tedarikci: e.target.value } : k)))
                    }
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    aria-label="Esansı kaldır"
                    onClick={() => setEsanslar((o) => o.filter((_, j) => j !== i))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  >
                    <CopSimgesi className="size-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <datalist id="esans-onerileri">
            {esansSozlugu.map((e) => (
              <option key={e.id} value={e.ad} />
            ))}
          </datalist>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Girdi
            etiket="Parti maliyeti (opsiyonel)"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="sayi"
            value={maliyet}
            onChange={(e) => setMaliyet(Number(e.target.value) || 0)}
            ipucu={partiBasiMaliyet > 0 ? `Şişe başı ${para(partiBasiMaliyet)}` : 'Esans + şişe + kutu toplamı'}
          />
          <MetinKutusu
            etiket="Not"
            rows={2}
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
            placeholder="Örn. ikinci deneme, alkol oranı düşürüldü"
          />
        </div>

        {hata && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {hata}
          </p>
        )}
      </div>
    </Modal>
  )
}
