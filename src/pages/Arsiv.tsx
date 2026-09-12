import { useMemo, useState } from 'react'
import { useVeri } from '../context/DataContext'
import { BosDurum, Buton, Girdi, Kart, Rozet } from '../components/ui'
import { ArsivSimgesi, IndirSimgesi } from '../components/ui/simgeler'
import SiparisDetay from '../components/siparis/SiparisDetay'
import SiparisFormu from '../components/siparis/SiparisFormu'
import { KargoModal, OdemeModal } from '../components/siparis/AksiyonModallari'
import { DURUM_RENKLERI, siparisAra } from '../lib/siparisDurum'
import type { Siparis } from '../types'
import { girdiTarihi, girdidenTarih, para, tarih, telefonGoster } from '../lib/format'
import { gunSonu, tarihe } from '../lib/date'
import { csvYaz, dosyaIndir } from '../lib/csv'


export default function Arsiv() {
  const { siparisler, katalogHaritasi } = useVeri()
  const [sorgu, setSorgu] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [parfumNo, setParfumNo] = useState('')
  const [detay, setDetay] = useState<Siparis | null>(null)
  const [duzenlenen, setDuzenlenen] = useState<Siparis | null>(null)
  const [formAcik, setFormAcik] = useState(false)
  const [kargoIcin, setKargoIcin] = useState<Siparis | null>(null)
  const [odemeIcin, setOdemeIcin] = useState<Siparis | null>(null)

  const arsivdekiler = useMemo(() => siparisler.filter((s) => s.arsiv), [siparisler])

  const listelenen = useMemo(() => {
    let liste = arsivdekiler

    if (baslangic) {
      const b = girdidenTarih(baslangic)
      liste = liste.filter((s) => {
        const t = tarihe(s.odemeTarihi) ?? tarihe(s.siparisTarihi)
        return t ? t >= b : false
      })
    }
    if (bitis) {
      const b = gunSonu(girdidenTarih(bitis))
      liste = liste.filter((s) => {
        const t = tarihe(s.odemeTarihi) ?? tarihe(s.siparisTarihi)
        return t ? t <= b : false
      })
    }
    if (parfumNo.trim()) {
      const no = Number(parfumNo)
      liste = liste.filter((s) => s.urunler.some((u) => u.parfumNo === no))
    }

    return siparisAra(liste, sorgu)
  }, [arsivdekiler, baslangic, bitis, parfumNo, sorgu])

  const toplam = listelenen.reduce((t, s) => t + s.toplamTutar, 0)

  function disaAktar() {
    const basliklar = [
      'Sipariş No',
      'Sipariş Tarihi',
      'Ödeme Tarihi',
      'Müşteri',
      'Telefon',
      'Adres',
      'Kaynak',
      'Durum',
      'Ürünler',
      'Adet',
      'Toplam Tutar',
      'Ödeme Yöntemi',
      'Kargo Firması',
      'Takip No',
      'Not',
    ]
    const satirlar = listelenen.map((s) => [
      s.siparisNo,
      tarih(tarihe(s.siparisTarihi)),
      tarih(tarihe(s.odemeTarihi)),
      s.musteri.ad,
      s.musteri.telefon,
      s.musteri.adres.replace(/\n/g, ' '),
      s.kaynak,
      s.durum,
      s.urunler.map((u) => `${u.kod || u.parfumNo}×${u.adet}`).join(' | '),
      s.urunler.reduce((t, u) => t + u.adet, 0),
      s.toplamTutar,
      s.odemeYontemi,
      s.kargoFirmasi,
      s.kargoTakipNo,
      s.notlar.replace(/\n/g, ' '),
    ])
    dosyaIndir(`arsiv-${girdiTarihi(new Date())}.csv`, csvYaz(basliklar, satirlar))
  }

  const acikSiparis = detay ? (siparisler.find((s) => s.id === detay.id) ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Arşiv</h1>
          <p className="sayi text-sm text-slate-500 dark:text-slate-400">
            {listelenen.length} sipariş · {para(toplam)}
          </p>
        </div>
        <Buton tur="ikincil" onClick={disaAktar} disabled={listelenen.length === 0}>
          <IndirSimgesi className="size-5" />
          <span className="hidden sm:inline">CSV indir</span>
          <span className="sm:hidden">CSV</span>
        </Buton>
      </header>

      <Kart className="flex flex-col gap-3 p-4">
        <Girdi
          type="search"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          placeholder="Müşteri, sipariş no veya telefon ara…"
          aria-label="Arşivde ara"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Girdi
            etiket="Başlangıç"
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
          <Girdi etiket="Bitiş" type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
          <Girdi
            etiket="Parfüm no"
            type="number"
            inputMode="numeric"
            className="sayi"
            value={parfumNo}
            onChange={(e) => setParfumNo(e.target.value)}
            placeholder="Örn. 12"
          />
        </div>
        {(baslangic || bitis || parfumNo || sorgu) && (
          <Buton
            tur="sessiz"
            boy="sm"
            onClick={() => {
              setBaslangic('')
              setBitis('')
              setParfumNo('')
              setSorgu('')
            }}
          >
            Filtreleri temizle
          </Buton>
        )}
      </Kart>

      {listelenen.length === 0 ? (
        <BosDurum
          simge={<ArsivSimgesi className="size-10" />}
          baslik="Arşivde kayıt yok"
          aciklama="Ödemesi alınan siparişler otomatik olarak buraya taşınır."
        />
      ) : (
        <Kart className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {listelenen.map((siparis) => (
            <button
              key={siparis.id}
              type="button"
              onClick={() => setDetay(siparis)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                  {siparis.musteri.ad || 'İsimsiz müşteri'}
                </p>
                <p className="sayi truncate text-xs text-slate-500 dark:text-slate-400">
                  {siparis.siparisNo} · {tarih(tarihe(siparis.odemeTarihi) ?? tarihe(siparis.siparisTarihi))}
                  {siparis.musteri.telefon && ` · ${telefonGoster(siparis.musteri.telefon)}`}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                  {siparis.urunler
                    .map((u) => `${u.kod || katalogHaritasi.get(u.parfumNo)?.kod || u.parfumNo}×${u.adet}`)
                    .join(', ')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="sayi font-bold text-slate-900 dark:text-slate-50">
                  {para(siparis.toplamTutar)}
                </span>
                <Rozet renk={DURUM_RENKLERI[siparis.durum]}>{siparis.durum}</Rozet>
              </div>
            </button>
          ))}
        </Kart>
      )}

      <SiparisDetay
        siparis={acikSiparis}
        kapat={() => setDetay(null)}
        kargolaAc={(s) => {
          setDetay(null)
          setKargoIcin(s)
        }}
        odemeAc={(s) => {
          setDetay(null)
          setOdemeIcin(s)
        }}
        duzenleAc={(s) => {
          setDetay(null)
          setDuzenlenen(s)
          setFormAcik(true)
        }}
      />

      <SiparisFormu
        acik={formAcik}
        kapat={() => {
          setFormAcik(false)
          setDuzenlenen(null)
        }}
        duzenlenen={duzenlenen}
      />
      <KargoModal siparis={kargoIcin} kapat={() => setKargoIcin(null)} />
      <OdemeModal siparis={odemeIcin} kapat={() => setOdemeIcin(null)} />
    </div>
  )
}
