import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import {
  ayarlarYolu,
  esansYolu,
  katalogYolu,
  siparisYolu,
  uretimYolu,
} from '../services/yollar'
import {
  ayarlarBelgeden,
  esansSozlukBelgeden,
  katalogBelgeden,
  siparisBelgeden,
  uretimBelgeden,
} from '../services/donusum'
import type { Ayarlar, EsansSozluk, KatalogUrun, Siparis, Uretim } from '../types'
import { VARSAYILAN_AYARLAR } from '../types'
import { stokOzeti, type ParfumStogu } from '../lib/demlenme'

interface VeriDegeri {
  katalog: KatalogUrun[]
  katalogHaritasi: Map<number, KatalogUrun>
  uretimler: Uretim[]
  siparisler: Siparis[]
  esanslar: EsansSozluk[]
  ayarlar: Ayarlar
  stokHaritasi: Map<number, ParfumStogu>
  yukleniyor: boolean
  cevrimdisi: boolean
  hata: string | null
}

const VeriContext = createContext<VeriDegeri | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { kullanici } = useAuth()
  const uid = kullanici?.uid ?? null

  const [katalog, setKatalog] = useState<KatalogUrun[]>([])
  const [uretimler, setUretimler] = useState<Uretim[]>([])
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [esanslar, setEsanslar] = useState<EsansSozluk[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar>(VARSAYILAN_AYARLAR)
  const [hazir, setHazir] = useState({ katalog: false, uretim: false, siparis: false, ayarlar: false })
  const [cevrimdisi, setCevrimdisi] = useState(!navigator.onLine)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    const acik = () => setCevrimdisi(false)
    const kapali = () => setCevrimdisi(true)
    window.addEventListener('online', acik)
    window.addEventListener('offline', kapali)
    return () => {
      window.removeEventListener('online', acik)
      window.removeEventListener('offline', kapali)
    }
  }, [])

  useEffect(() => {
    if (!uid) {
      setKatalog([])
      setUretimler([])
      setSiparisler([])
      setEsanslar([])
      setAyarlar(VARSAYILAN_AYARLAR)
      setHazir({ katalog: false, uretim: false, siparis: false, ayarlar: false })
      return
    }

    setHata(null)
    const hataYakala = (e: unknown) => setHata((e as Error)?.message ?? 'Veri okunamadı.')

    const birakmalar = [
      onSnapshot(
        query(katalogYolu(uid), orderBy('no', 'asc')),
        (anlik) => {
          setKatalog(anlik.docs.map((d) => katalogBelgeden(d.id, d.data())))
          setHazir((o) => ({ ...o, katalog: true }))
        },
        hataYakala,
      ),
      onSnapshot(
        query(uretimYolu(uid), orderBy('uretimTarihi', 'desc')),
        (anlik) => {
          setUretimler(anlik.docs.map((d) => uretimBelgeden(d.id, d.data())))
          setHazir((o) => ({ ...o, uretim: true }))
        },
        hataYakala,
      ),
      onSnapshot(
        query(siparisYolu(uid), orderBy('siparisTarihi', 'desc')),
        (anlik) => {
          setSiparisler(anlik.docs.map((d) => siparisBelgeden(d.id, d.data())))
          setHazir((o) => ({ ...o, siparis: true }))
        },
        hataYakala,
      ),
      onSnapshot(
        esansYolu(uid),
        (anlik) => setEsanslar(anlik.docs.map((d) => esansSozlukBelgeden(d.id, d.data()))),
        hataYakala,
      ),
      onSnapshot(
        ayarlarYolu(uid),
        (anlik) => {
          setAyarlar(ayarlarBelgeden(anlik.data()))
          setHazir((o) => ({ ...o, ayarlar: true }))
        },
        hataYakala,
      ),
    ]

    return () => birakmalar.forEach((birak) => birak())
  }, [uid])

  const deger = useMemo<VeriDegeri>(() => {
    const katalogHaritasi = new Map(katalog.map((u) => [u.no, u]))
    return {
      katalog,
      katalogHaritasi,
      uretimler,
      siparisler,
      esanslar,
      ayarlar,
      stokHaritasi: stokOzeti(uretimler),
      yukleniyor: Boolean(uid) && !(hazir.katalog && hazir.uretim && hazir.siparis),
      cevrimdisi,
      hata,
    }
  }, [katalog, uretimler, siparisler, esanslar, ayarlar, uid, hazir, cevrimdisi, hata])

  return <VeriContext value={deger}>{children}</VeriContext>
}

export function useVeri(): VeriDegeri {
  const deger = useContext(VeriContext)
  if (!deger) throw new Error('useVeri yalnızca DataProvider içinde kullanılabilir')
  return deger
}

/** Oturum açmış kullanıcının uid'si — korumalı ekranlarda garanti vardır. */
export function useUid(): string {
  const { kullanici } = useAuth()
  if (!kullanici) throw new Error('Oturum açık değil')
  return kullanici.uid
}
