import { useMemo, useState } from 'react'
import { useVeri } from '../context/DataContext'
import { BosDurum, Buton, Kart, Rozet, Sekmeler } from '../components/ui'
import { IndirSimgesi, RaporSimgesi } from '../components/ui/simgeler'
import { aylikCiro, cokSatanlar, panelOzeti } from '../lib/istatistik'
import { ayEtiketi, gunEkle, tarihe } from '../lib/date'
import { girdiTarihi, para, sayi } from '../lib/format'
import { csvYaz, dosyaIndir } from '../lib/csv'

type Donem = '30' | '90' | '365' | 'hepsi'

const DONEMLER: Array<{ deger: Donem; etiket: string }> = [
  { deger: '30', etiket: 'Son 30 gün' },
  { deger: '90', etiket: 'Son 90 gün' },
  { deger: '365', etiket: 'Son 1 yıl' },
  { deger: 'hepsi', etiket: 'Tüm zamanlar' },
]

export default function Raporlar() {
  const { siparisler, katalogHaritasi, uretimler } = useVeri()
  const [donem, setDonem] = useState<Donem>('90')

  const baslangic = useMemo(
    () => (donem === 'hepsi' ? undefined : gunEkle(new Date(), -Number(donem))),
    [donem],
  )

  const ozet = useMemo(() => panelOzeti(siparisler), [siparisler])
  const aylar = useMemo(() => aylikCiro(siparisler, 12), [siparisler])
  const enCok = useMemo(() => cokSatanlar(siparisler, 10, baslangic), [siparisler, baslangic])

  const enYuksekCiro = Math.max(1, ...aylar.map((a) => a.ciro))
  const yillikToplam = aylar.reduce((t, a) => t + a.ciro, 0)

  // Maliyet girilen partilerden kabaca kâr tahmini.
  const maliyetOzeti = useMemo(() => {
    let toplamMaliyet = 0
    let maliyetliSise = 0
    for (const uretim of uretimler) {
      if (uretim.maliyet > 0 && uretim.adet > 0) {
        toplamMaliyet += uretim.maliyet
        maliyetliSise += uretim.adet
      }
    }
    const siseBasi = maliyetliSise > 0 ? toplamMaliyet / maliyetliSise : 0
    const satilanSise = siparisler
      .filter((s) => s.durum !== 'İptal')
      .reduce((t, s) => t + s.urunler.reduce((k, u) => k + u.adet, 0), 0)
    return {
      siseBasi,
      tahminiMaliyet: siseBasi * satilanSise,
      satilanSise,
      veriVar: maliyetliSise > 0,
    }
  }, [uretimler, siparisler])

  const toplamCiro = useMemo(
    () =>
      siparisler
        .filter((s) => s.durum !== 'İptal')
        .filter((s) => !baslangic || (tarihe(s.siparisTarihi) ?? new Date(0)) >= baslangic)
        .reduce((t, s) => t + s.toplamTutar, 0),
    [siparisler, baslangic],
  )

  function aylikCsvIndir() {
    dosyaIndir(
      `aylik-ciro-${girdiTarihi(new Date())}.csv`,
      csvYaz(['Ay', 'Sipariş adedi', 'Ciro'], aylar.map((a) => [ayEtiketi(a.anahtar), a.adet, a.ciro])),
    )
  }

  function cokSatanCsvIndir() {
    dosyaIndir(
      `cok-satanlar-${girdiTarihi(new Date())}.csv`,
      csvYaz(
        ['Parfüm no', 'Kod', 'Satılan adet', 'Ciro'],
        enCok.map((c) => [c.parfumNo, katalogHaritasi.get(c.parfumNo)?.kod ?? '', c.adet, c.ciro]),
      ),
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Raporlar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ciro, satış hızı ve kârlılık özeti</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OzetKutusu baslik="Bu ay" ana={para(ozet.buAy.ciro)} alt={`${ozet.buAy.adet} sipariş`} />
        <OzetKutusu baslik="Son 12 ay" ana={para(yillikToplam)} alt="toplam ciro" />
        <OzetKutusu
          baslik="Bekleyen tahsilat"
          ana={para(ozet.bekleyenTahsilat)}
          alt={`${ozet.bekleyenAdet} sipariş`}
        />
        <OzetKutusu
          baslik="Tahmini kâr"
          ana={maliyetOzeti.veriVar ? para(toplamCiro - maliyetOzeti.tahminiMaliyet) : '—'}
          alt={
            maliyetOzeti.veriVar
              ? `şişe başı ${para(maliyetOzeti.siseBasi)} maliyet`
              : 'üretim maliyeti girilmemiş'
          }
        />
      </div>

      {/* Aylık ciro grafiği */}
      <Kart className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-slate-50">Aylık ciro (son 12 ay)</h2>
          <Buton tur="sessiz" boy="sm" onClick={aylikCsvIndir}>
            <IndirSimgesi className="size-4" />
            CSV
          </Buton>
        </div>

        {yillikToplam === 0 ? (
          <BosDurum simge={<RaporSimgesi className="size-10" />} baslik="Henüz satış verisi yok" />
        ) : (
          <div className="flex h-56 items-stretch gap-1.5 sm:gap-2">
            {aylar.map((ay) => {
              const yukseklik = Math.round((ay.ciro / enYuksekCiro) * 100)
              return (
                <div key={ay.anahtar} className="group flex flex-1 flex-col items-center gap-1.5">
                  <span className="sayi text-[10px] font-semibold text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-400">
                    {ay.ciro > 0 ? para(ay.ciro) : ''}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-marka-500 transition-all hover:bg-marka-600"
                      style={{ height: `${Math.max(2, yukseklik)}%` }}
                      title={`${ayEtiketi(ay.anahtar)}: ${para(ay.ciro)} (${ay.adet} sipariş)`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {ayEtiketi(ay.anahtar)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Kart>

      {/* En çok satan 10 numara */}
      <Kart className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-slate-50">En çok satan 10 numara</h2>
          <Buton tur="sessiz" boy="sm" onClick={cokSatanCsvIndir} disabled={enCok.length === 0}>
            <IndirSimgesi className="size-4" />
            CSV
          </Buton>
        </div>

        <Sekmeler
          secili={donem}
          degisti={setDonem}
          sekmeler={DONEMLER.map((d) => ({ deger: d.deger, etiket: d.etiket }))}
        />

        {enCok.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Bu dönemde satış kaydı yok.
          </p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {enCok.map((satir, i) => (
              <div key={satir.parfumNo} className="flex items-center gap-3 py-2.5">
                <span className="sayi w-6 text-sm font-bold text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    No {satir.parfumNo}
                    {katalogHaritasi.get(satir.parfumNo)?.kod && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {katalogHaritasi.get(satir.parfumNo)?.kod}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-marka-500"
                      style={{ width: `${(satir.adet / enCok[0].adet) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Rozet renk="mavi">{sayi(satir.adet)} şişe</Rozet>
                  <p className="sayi mt-1 text-xs text-slate-500 dark:text-slate-400">{para(satir.ciro)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Kart>
    </div>
  )
}

function OzetKutusu({ baslik, ana, alt }: { baslik: string; ana: string; alt: string }) {
  return (
    <Kart className="p-3.5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{baslik}</p>
      <p className="sayi mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">{ana}</p>
      <p className="sayi mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alt}</p>
    </Kart>
  )
}
