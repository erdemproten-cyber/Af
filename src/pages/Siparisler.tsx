import { useMemo, useState } from 'react'
import { useVeri } from '../context/DataContext'
import { Buton, BosDurum, Girdi, Sekmeler } from '../components/ui'
import { ArtiSimgesi, SiparisSimgesi } from '../components/ui/simgeler'
import SiparisKarti from '../components/siparis/SiparisKarti'
import SiparisDetay from '../components/siparis/SiparisDetay'
import SiparisFormu from '../components/siparis/SiparisFormu'
import { KargoModal, OdemeModal } from '../components/siparis/AksiyonModallari'
import type { Siparis, SiparisDurumu } from '../types'
import { siparisAra } from '../lib/siparisDurum'


type Sekme = 'hepsi' | 'Yeni' | 'Hazırlanıyor' | 'Kargolandı' | 'Teslim Edildi' | 'İptal'

const SEKME_SIRASI: Sekme[] = ['hepsi', 'Yeni', 'Hazırlanıyor', 'Kargolandı', 'Teslim Edildi', 'İptal']

export default function Siparisler() {
  const { siparisler } = useVeri()
  const [sekme, setSekme] = useState<Sekme>('hepsi')
  const [sorgu, setSorgu] = useState('')
  const [detay, setDetay] = useState<Siparis | null>(null)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState<Siparis | null>(null)
  const [kargoIcin, setKargoIcin] = useState<Siparis | null>(null)
  const [odemeIcin, setOdemeIcin] = useState<Siparis | null>(null)

  // Arşivdekiler bu ekranda görünmez; Arşiv sekmesinde listelenir.
  const aktifler = useMemo(() => siparisler.filter((s) => !s.arsiv), [siparisler])

  const sayilar = useMemo(() => {
    const harita = new Map<Sekme, number>([['hepsi', aktifler.length]])
    for (const s of aktifler) {
      harita.set(s.durum as Sekme, (harita.get(s.durum as Sekme) ?? 0) + 1)
    }
    return harita
  }, [aktifler])

  const listelenen = useMemo(() => {
    const durumFiltreli =
      sekme === 'hepsi' ? aktifler : aktifler.filter((s) => s.durum === (sekme as SiparisDurumu))
    return siparisAra(durumFiltreli, sorgu)
  }, [aktifler, sekme, sorgu])

  // Detay açıkken liste güncellenirse en taze kaydı göster.
  const acikSiparis = detay ? (siparisler.find((s) => s.id === detay.id) ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Siparişler</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{aktifler.length} aktif sipariş</p>
        </div>
        <Buton
          onClick={() => {
            setDuzenlenen(null)
            setFormAcik(true)
          }}
        >
          <ArtiSimgesi className="size-5" />
          <span className="hidden sm:inline">Yeni sipariş</span>
          <span className="sm:hidden">Yeni</span>
        </Buton>
      </header>

      <Girdi
        type="search"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder="Sipariş no, müşteri, telefon veya parfüm no ara…"
        aria-label="Sipariş ara"
      />

      <Sekmeler
        secili={sekme}
        degisti={setSekme}
        sekmeler={SEKME_SIRASI.map((d) => ({
          deger: d,
          etiket: d === 'hepsi' ? 'Hepsi' : d,
          sayi: sayilar.get(d) ?? 0,
        }))}
      />

      {listelenen.length === 0 ? (
        <BosDurum
          simge={<SiparisSimgesi className="size-10" />}
          baslik={sorgu ? 'Eşleşen sipariş yok' : 'Bu sekmede sipariş yok'}
          aciklama={
            sorgu
              ? 'Arama terimini değiştirip tekrar deneyin.'
              : 'Yeni sipariş ekleyerek başlayabilirsiniz.'
          }
          eylem={
            !sorgu && (
              <Buton
                onClick={() => {
                  setDuzenlenen(null)
                  setFormAcik(true)
                }}
              >
                <ArtiSimgesi className="size-5" />
                Yeni sipariş
              </Buton>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {listelenen.map((siparis) => (
            <SiparisKarti
              key={siparis.id}
              siparis={siparis}
              ac={() => setDetay(siparis)}
              kargola={() => setKargoIcin(siparis)}
              odemeAl={() => setOdemeIcin(siparis)}
            />
          ))}
        </div>
      )}

      <SiparisFormu
        acik={formAcik}
        kapat={() => {
          setFormAcik(false)
          setDuzenlenen(null)
        }}
        duzenlenen={duzenlenen}
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
          setFormAcik(true)
        }}
      />

      <KargoModal siparis={kargoIcin} kapat={() => setKargoIcin(null)} />
      <OdemeModal siparis={odemeIcin} kapat={() => setOdemeIcin(null)} />
    </div>
  )
}
