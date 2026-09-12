import { useMemo, useState } from 'react'
import { useVeri } from '../context/DataContext'
import { BosDurum, Buton, Girdi, Kart, Modal, Rozet } from '../components/ui'
import { ArtiSimgesi, KisiSimgesi, WhatsappSimgesi } from '../components/ui/simgeler'
import SiparisFormu from '../components/siparis/SiparisFormu'
import SiparisDetay from '../components/siparis/SiparisDetay'
import { KargoModal, OdemeModal } from '../components/siparis/AksiyonModallari'
import { DURUM_RENKLERI } from '../lib/siparisDurum'
import { musteriOzetleri, type MusteriOzeti } from '../lib/istatistik'
import { musteriSiparisleri } from '../services/siparis'
import { aramaMetni, para, tarih, telefonGoster, telefonNormalize } from '../lib/format'
import { tarihe } from '../lib/date'
import type { Siparis } from '../types'

export default function Musteriler() {
  const { siparisler, katalogHaritasi } = useVeri()
  const [sorgu, setSorgu] = useState('')
  const [secili, setSecili] = useState<MusteriOzeti | null>(null)
  const [yeniSiparis, setYeniSiparis] = useState<string | null>(null)
  const [detay, setDetay] = useState<Siparis | null>(null)
  const [kargoIcin, setKargoIcin] = useState<Siparis | null>(null)
  const [odemeIcin, setOdemeIcin] = useState<Siparis | null>(null)

  const musteriler = useMemo(() => musteriOzetleri(siparisler), [siparisler])

  const listelenen = useMemo(() => {
    const q = aramaMetni(sorgu)
    if (!q) return musteriler
    const rakamlar = q.replace(/\D/g, '')
    return musteriler.filter(
      (m) =>
        aramaMetni(m.ad).includes(q) ||
        (rakamlar.length >= 3 && m.telefon.replace(/\D/g, '').includes(rakamlar)),
    )
  }, [musteriler, sorgu])

  const seciliSiparisler = useMemo(
    () => (secili ? musteriSiparisleri(siparisler, secili.telefon) : []),
    [secili, siparisler],
  )

  const acikSiparis = detay ? (siparisler.find((s) => s.id === detay.id) ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Müşteriler</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {musteriler.length} müşteri · aynı telefon numarası tek kartta toplanır
        </p>
      </header>

      <Girdi
        type="search"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder="Ad veya telefon ara…"
        aria-label="Müşteri ara"
      />

      {listelenen.length === 0 ? (
        <BosDurum
          simge={<KisiSimgesi className="size-10" />}
          baslik={sorgu ? 'Eşleşen müşteri yok' : 'Henüz müşteri kaydı yok'}
          aciklama="Sipariş oluşturdukça müşteri kartları otomatik oluşur."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {listelenen.map((musteri) => (
            <Kart key={musteri.telefon + musteri.ad} className="p-4">
              <button type="button" onClick={() => setSecili(musteri)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-slate-50">
                      {musteri.ad || 'İsimsiz müşteri'}
                    </p>
                    <p className="sayi text-xs text-slate-500 dark:text-slate-400">
                      {telefonGoster(musteri.telefon)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="sayi font-bold text-slate-900 dark:text-slate-50">
                      {para(musteri.toplamTutar)}
                    </p>
                    <p className="sayi text-xs text-slate-500 dark:text-slate-400">
                      {musteri.siparisAdedi} sipariş
                    </p>
                  </div>
                </div>

                {musteri.favoriNumaralar.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Sık aldıkları:</span>
                    {musteri.favoriNumaralar.map((no) => (
                      <Rozet key={no} renk="mor">
                        No {no}
                      </Rozet>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Son sipariş: {tarih(musteri.sonSiparis)}
                </p>
              </button>
            </Kart>
          ))}
        </div>
      )}

      {/* Müşteri kartı */}
      <Modal
        acik={Boolean(secili)}
        kapat={() => setSecili(null)}
        genis
        baslik={secili?.ad || 'Müşteri kartı'}
        aciklama={secili ? telefonGoster(secili.telefon) : undefined}
        altBilgi={
          secili && (
            <>
              {telefonNormalize(secili.telefon) && (
                <a
                  href={`https://wa.me/${telefonNormalize(secili.telefon)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <WhatsappSimgesi className="size-5" />
                  WhatsApp
                </a>
              )}
              <Buton
                className="flex-1"
                onClick={() => {
                  setYeniSiparis(secili.telefon)
                  setSecili(null)
                }}
              >
                <ArtiSimgesi className="size-5" />
                Yeni sipariş
              </Buton>
            </>
          )
        }
      >
        {secili && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Kart className="p-3 text-center">
                <p className="sayi text-lg font-bold text-slate-900 dark:text-slate-50">
                  {secili.siparisAdedi}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sipariş</p>
              </Kart>
              <Kart className="p-3 text-center">
                <p className="sayi text-lg font-bold text-slate-900 dark:text-slate-50">
                  {para(secili.toplamTutar)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toplam</p>
              </Kart>
              <Kart className="p-3 text-center">
                <p className="sayi text-lg font-bold text-slate-900 dark:text-slate-50">
                  {para(secili.toplamTutar / Math.max(1, secili.siparisAdedi))}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ortalama</p>
              </Kart>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                Geçmiş siparişler
              </h3>
              <Kart className="divide-y divide-slate-100 dark:divide-slate-800">
                {seciliSiparisler.map((siparis) => (
                  <button
                    key={siparis.id}
                    type="button"
                    onClick={() => {
                      setSecili(null)
                      setDetay(siparis)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="sayi text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {siparis.siparisNo} · {tarih(tarihe(siparis.siparisTarihi))}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {siparis.urunler
                          .map(
                            (u) =>
                              `${u.kod || katalogHaritasi.get(u.parfumNo)?.kod || `No ${u.parfumNo}`}×${u.adet}`,
                          )
                          .join(', ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="sayi text-sm font-bold text-slate-900 dark:text-slate-50">
                        {para(siparis.toplamTutar)}
                      </span>
                      <Rozet renk={DURUM_RENKLERI[siparis.durum]}>{siparis.durum}</Rozet>
                    </div>
                  </button>
                ))}
              </Kart>
            </div>
          </div>
        )}
      </Modal>

      <SiparisFormu
        acik={Boolean(yeniSiparis)}
        kapat={() => setYeniSiparis(null)}
        onDolguTelefon={yeniSiparis ?? undefined}
      />

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
        duzenleAc={() => setDetay(null)}
      />
      <KargoModal siparis={kargoIcin} kapat={() => setKargoIcin(null)} />
      <OdemeModal siparis={odemeIcin} kapat={() => setOdemeIcin(null)} />
    </div>
  )
}
