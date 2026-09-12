import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useVeri } from '../context/DataContext'
import { Buton, Kart, Rozet, birlestir } from '../components/ui'
import SiparisKarti from '../components/siparis/SiparisKarti'
import { odemeBeklemeGunu } from '../lib/siparisDurum'
import SiparisDetay from '../components/siparis/SiparisDetay'
import SiparisFormu from '../components/siparis/SiparisFormu'
import { KargoModal, OdemeModal } from '../components/siparis/AksiyonModallari'
import UretimFormu from '../components/envanter/UretimFormu'
import {
  ArtiSimgesi,
  KargoSimgesi,
  ParaSimgesi,
  SaatSimgesi,
  SiseSimgesi,
  UyariSimgesi,
} from '../components/ui/simgeler'
import type { Siparis } from '../types'
import { para, sayi, tarih } from '../lib/format'
import { tarihe } from '../lib/date'
import {
  demlenmesiBitenler,
  dusukStoklar,
  kargoBekleyenler,
  odemeBekleyenler,
  panelOzeti,
  uretimOnerileri,
  yakindaHazirOlanlar,
} from '../lib/istatistik'

const GECIKME_ESIGI = 7

export default function Panel() {
  const { siparisler, uretimler, stokHaritasi, katalogHaritasi, ayarlar } = useVeri()
  const [detay, setDetay] = useState<Siparis | null>(null)
  const [kargoIcin, setKargoIcin] = useState<Siparis | null>(null)
  const [odemeIcin, setOdemeIcin] = useState<Siparis | null>(null)
  const [siparisFormu, setSiparisFormu] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState<Siparis | null>(null)
  const [uretimFormu, setUretimFormu] = useState(false)
  const [uretimNo, setUretimNo] = useState<number | undefined>(undefined)

  const ozet = useMemo(() => panelOzeti(siparisler), [siparisler])
  const kargolanacak = useMemo(() => kargoBekleyenler(siparisler), [siparisler])
  const tahsilEdilecek = useMemo(() => odemeBekleyenler(siparisler), [siparisler])
  const gecikenler = useMemo(
    () =>
      tahsilEdilecek
        .filter((s) => (odemeBeklemeGunu(s) ?? 0) > GECIKME_ESIGI)
        .sort((a, b) => (odemeBeklemeGunu(b) ?? 0) - (odemeBeklemeGunu(a) ?? 0)),
    [tahsilEdilecek],
  )
  const yeniHazirlar = useMemo(() => demlenmesiBitenler(uretimler, 14), [uretimler])
  const yakinlar = useMemo(() => yakindaHazirOlanlar(uretimler, 7), [uretimler])
  const azalanlar = useMemo(
    () => dusukStoklar(stokHaritasi, ayarlar.dusukStokEsigi),
    [stokHaritasi, ayarlar.dusukStokEsigi],
  )
  const oneriler = useMemo(
    () => uretimOnerileri(siparisler, stokHaritasi, ayarlar.varsayilanDemlenmeGun),
    [siparisler, stokHaritasi, ayarlar.varsayilanDemlenmeGun],
  )

  const acikSiparis = detay ? (siparisler.find((s) => s.id === detay.id) ?? null) : null

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Panel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tarih(new Date())}</p>
        </div>
        <Buton
          onClick={() => {
            setDuzenlenen(null)
            setSiparisFormu(true)
          }}
        >
          <ArtiSimgesi className="size-5" />
          <span className="hidden sm:inline">Yeni sipariş</span>
          <span className="sm:hidden">Yeni</span>
        </Buton>
      </header>

      {/* Dönem özetleri */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OzetKutusu baslik="Bugün" ana={para(ozet.bugun.ciro)} alt={`${ozet.bugun.adet} sipariş`} />
        <OzetKutusu baslik="Bu hafta" ana={para(ozet.buHafta.ciro)} alt={`${ozet.buHafta.adet} sipariş`} />
        <OzetKutusu baslik="Bu ay" ana={para(ozet.buAy.ciro)} alt={`${ozet.buAy.adet} sipariş`} />
        <OzetKutusu
          baslik="Bekleyen tahsilat"
          ana={para(ozet.bekleyenTahsilat)}
          alt={`${ozet.bekleyenAdet} sipariş`}
          vurgulu={ozet.bekleyenTahsilat > 0}
        />
      </div>

      {/* Geciken ödemeler — kırmızı uyarı */}
      {gecikenler.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UyariSimgesi className="size-5 text-rose-600 dark:text-rose-400" />
            <h2 className="font-bold text-rose-700 dark:text-rose-400">
              {GECIKME_ESIGI} günden uzun süredir ödeme alınmadı ({gecikenler.length})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {gecikenler.slice(0, 4).map((siparis) => (
              <SiparisKarti
                key={siparis.id}
                siparis={siparis}
                ac={() => setDetay(siparis)}
                odemeAl={() => setOdemeIcin(siparis)}
                gecikmeEsigi={GECIKME_ESIGI}
              />
            ))}
          </div>
          {gecikenler.length > 4 && (
            <Link
              to="/siparisler"
              className="text-sm font-semibold text-marka-600 underline-offset-4 hover:underline dark:text-marka-400"
            >
              Tümünü gör ({gecikenler.length})
            </Link>
          )}
        </section>
      )}

      {/* Aksiyon kutuları */}
      <div className="grid gap-3 sm:grid-cols-2">
        <AksiyonKutusu
          baslik="Kargolanmayı bekleyen"
          sayi={kargolanacak.length}
          renk="mavi"
          Simge={KargoSimgesi}
          bos="Bekleyen sipariş yok."
        >
          {kargolanacak.slice(0, 5).map((siparis) => (
            <SatirOge
              key={siparis.id}
              ana={siparis.musteri.ad || siparis.siparisNo}
              alt={`${siparis.siparisNo} · ${para(siparis.toplamTutar)}`}
              tik={() => setDetay(siparis)}
              eylem={
                <Buton
                  boy="sm"
                  tur="ikincil"
                  onClick={(e) => {
                    e.stopPropagation()
                    setKargoIcin(siparis)
                  }}
                >
                  Kargola
                </Buton>
              }
            />
          ))}
        </AksiyonKutusu>

        <AksiyonKutusu
          baslik="Kargolandı, ödeme alınmadı"
          sayi={tahsilEdilecek.length}
          renk="sari"
          Simge={ParaSimgesi}
          bos="Bekleyen tahsilat yok."
        >
          {tahsilEdilecek.slice(0, 5).map((siparis) => {
            const gun = odemeBeklemeGunu(siparis) ?? 0
            return (
              <SatirOge
                key={siparis.id}
                ana={siparis.musteri.ad || siparis.siparisNo}
                alt={`${gun} gündür bekliyor · ${para(siparis.toplamTutar)}`}
                vurgulu={gun > GECIKME_ESIGI}
                tik={() => setDetay(siparis)}
                eylem={
                  <Buton
                    boy="sm"
                    tur="basari"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOdemeIcin(siparis)
                    }}
                  >
                    Ödendi
                  </Buton>
                }
              />
            )
          })}
        </AksiyonKutusu>

        <AksiyonKutusu
          baslik="Demlenmesi yeni bitenler"
          sayi={yeniHazirlar.length}
          renk="yesil"
          Simge={SiseSimgesi}
          bos="Son 14 günde demlenmesi biten parti yok."
        >
          {yeniHazirlar.slice(0, 5).map((uretim) => (
            <SatirOge
              key={uretim.id}
              ana={`No ${uretim.parfumNo} · ${katalogHaritasi.get(uretim.parfumNo)?.kod ?? ''}`}
              alt={`${uretim.kalanAdet} şişe hazır · ${tarih(tarihe(uretim.demlenmeBitis))}`}
            />
          ))}
          {yakinlar.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <SaatSimgesi className="size-4" />
                Bu hafta hazır olacaklar
              </p>
              {yakinlar.slice(0, 3).map((uretim) => (
                <SatirOge
                  key={uretim.id}
                  ana={`No ${uretim.parfumNo}`}
                  alt={`${uretim.kalanAdet} şişe · ${tarih(tarihe(uretim.demlenmeBitis))}`}
                />
              ))}
            </div>
          )}
        </AksiyonKutusu>

        <AksiyonKutusu
          baslik={`Stoğu ${ayarlar.dusukStokEsigi} adedin altındakiler`}
          sayi={azalanlar.length}
          renk="kirmizi"
          Simge={UyariSimgesi}
          bos="Stok seviyeleri iyi durumda."
        >
          {azalanlar.slice(0, 6).map((stok) => (
            <SatirOge
              key={stok.parfumNo}
              ana={`No ${stok.parfumNo} · ${katalogHaritasi.get(stok.parfumNo)?.kod ?? ''}`}
              alt={
                stok.demlenenAdet > 0
                  ? `${stok.hazirAdet} hazır · ${stok.demlenenAdet} demleniyor${
                      stok.enYakinHazirGun !== null ? ` (${stok.enYakinHazirGun} gün)` : ''
                    }`
                  : `${stok.hazirAdet} hazır · demlenen yok`
              }
              vurgulu={stok.hazirAdet === 0}
              eylem={
                <Buton
                  boy="sm"
                  tur="ikincil"
                  onClick={(e) => {
                    e.stopPropagation()
                    setUretimNo(stok.parfumNo)
                    setUretimFormu(true)
                  }}
                >
                  Üret
                </Buton>
              }
            />
          ))}
        </AksiyonKutusu>
      </div>

      {/* Üretim önerisi */}
      {oneriler.length > 0 && (
        <Kart className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <SiseSimgesi className="size-5 text-marka-600 dark:text-marka-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-50">Şimdi üretmelisin</h2>
            <Rozet renk="sari">{oneriler.length}</Rozet>
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Son 90 günün satış hızına göre hesaplandı. {ayarlar.varsayilanDemlenmeGun} günlük demlenme
            süresi nedeniyle bu numaraları şimdiden üretmeniz gerekiyor.
          </p>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {oneriler.slice(0, 6).map((oneri) => (
              <SatirOge
                key={oneri.parfumNo}
                ana={`No ${oneri.parfumNo} · ${katalogHaritasi.get(oneri.parfumNo)?.kod ?? ''}`}
                alt={`Ayda ~${sayi(oneri.aylikHiz)} satıyor · stok ${oneri.tukenmeGunu} günde biter · ~${oneri.onerilenAdet} şişe üret`}
                eylem={
                  <Buton
                    boy="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setUretimNo(oneri.parfumNo)
                      setUretimFormu(true)
                    }}
                  >
                    Üret
                  </Buton>
                }
              />
            ))}
          </div>
        </Kart>
      )}

      <SiparisFormu
        acik={siparisFormu}
        kapat={() => {
          setSiparisFormu(false)
          setDuzenlenen(null)
        }}
        duzenlenen={duzenlenen}
      />

      <UretimFormu
        acik={uretimFormu}
        kapat={() => {
          setUretimFormu(false)
          setUretimNo(undefined)
        }}
        onDolguNo={uretimNo}
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
        duzenleAc={(s) => {
          setDetay(null)
          setDuzenlenen(s)
          setSiparisFormu(true)
        }}
      />

      <KargoModal siparis={kargoIcin} kapat={() => setKargoIcin(null)} />
      <OdemeModal siparis={odemeIcin} kapat={() => setOdemeIcin(null)} />
    </div>
  )
}

/* ------------------------------------------------------------- Alt bileşenler */

function OzetKutusu({
  baslik,
  ana,
  alt,
  vurgulu,
}: {
  baslik: string
  ana: string
  alt: string
  vurgulu?: boolean
}) {
  return (
    <Kart className={birlestir('p-3.5', vurgulu && 'border-amber-300 dark:border-amber-500/40')}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{baslik}</p>
      <p className="sayi mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">{ana}</p>
      <p className="sayi mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alt}</p>
    </Kart>
  )
}

const KUTU_RENKLERI = {
  mavi: 'text-sky-600 dark:text-sky-400',
  sari: 'text-amber-600 dark:text-amber-400',
  yesil: 'text-emerald-600 dark:text-emerald-400',
  kirmizi: 'text-rose-600 dark:text-rose-400',
} as const

function AksiyonKutusu({
  baslik,
  sayi: adet,
  renk,
  Simge,
  bos,
  children,
}: {
  baslik: string
  sayi: number
  renk: keyof typeof KUTU_RENKLERI
  Simge: (p: { className?: string }) => ReactNode
  bos: string
  children: ReactNode
}) {
  return (
    <Kart className="flex flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <Simge className={birlestir('size-5', KUTU_RENKLERI[renk])} />
        <h2 className="flex-1 font-bold text-slate-900 dark:text-slate-50">{baslik}</h2>
        <span className={birlestir('sayi text-xl font-bold', KUTU_RENKLERI[renk])}>{adet}</span>
      </div>
      {adet === 0 ? (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">{bos}</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
      )}
    </Kart>
  )
}

function SatirOge({
  ana,
  alt,
  eylem,
  tik,
  vurgulu,
}: {
  ana: string
  alt: string
  eylem?: ReactNode
  tik?: () => void
  vurgulu?: boolean
}) {
  const icerik = (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{ana}</p>
        <p
          className={birlestir(
            'sayi truncate text-xs',
            vurgulu ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {alt}
        </p>
      </div>
      {eylem}
    </div>
  )

  if (!tik) return icerik
  return (
    <div role="button" tabIndex={0} onClick={tik} onKeyDown={(e) => e.key === 'Enter' && tik()} className="cursor-pointer">
      {icerik}
    </div>
  )
}
