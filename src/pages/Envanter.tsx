import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUid, useVeri } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Buton, BosDurum, Girdi, IlerlemeCubugu, Kart, Rozet, Sekmeler, birlestir } from '../components/ui'
import { OnayKutusu } from '../components/ui/Onay'
import { ArtiSimgesi, SiseSimgesi } from '../components/ui/simgeler'
import UretimFormu from '../components/envanter/UretimFormu'
import PartiKarti from '../components/envanter/PartiKarti'
import QrModal from '../components/envanter/QrModal'
import type { Uretim } from '../types'
import { uretimSil } from '../services/uretim'
import { demlenmeDurumu, demlenmeRengi, type ParfumStogu } from '../lib/demlenme'
import { aramaMetni, sayi } from '../lib/format'

type Filtre = 'hepsi' | 'hazir' | 'demlenen' | 'azalan'

export default function Envanter() {
  const uid = useUid()
  const { uretimler, katalogHaritasi, stokHaritasi, ayarlar } = useVeri()
  const toast = useToast()
  const [aramaParams, setAramaParams] = useSearchParams()

  const [filtre, setFiltre] = useState<Filtre>('hepsi')
  const [sorgu, setSorgu] = useState('')
  const [acikNo, setAcikNo] = useState<number | null>(null)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState<Uretim | null>(null)
  const [onDolguNo, setOnDolguNo] = useState<number | undefined>(undefined)
  const [qrParti, setQrParti] = useState<Uretim | null>(null)
  const [silinecek, setSilinecek] = useState<Uretim | null>(null)

  // QR ile gelindiyse (…/envanter?parti=ID) ilgili numarayı açar.
  useEffect(() => {
    const partiId = aramaParams.get('parti')
    if (!partiId) return
    const parti = uretimler.find((u) => u.id === partiId)
    if (parti) {
      setAcikNo(parti.parfumNo)
      setSorgu(String(parti.parfumNo))
    }
    aramaParams.delete('parti')
    setAramaParams(aramaParams, { replace: true })
  }, [aramaParams, setAramaParams, uretimler])

  const gruplar = useMemo(() => {
    const liste = [...stokHaritasi.values()]
    const sorguMetni = aramaMetni(sorgu)

    const filtreli = liste.filter((stok) => {
      if (sorguMetni) {
        const urun = katalogHaritasi.get(stok.parfumNo)
        const eslesti =
          String(stok.parfumNo).startsWith(sorguMetni) ||
          aramaMetni(urun?.kod).includes(sorguMetni) ||
          aramaMetni(urun?.aciklama).includes(sorguMetni)
        if (!eslesti) return false
      }
      if (filtre === 'hazir') return stok.hazirAdet > 0
      if (filtre === 'demlenen') return stok.demlenenAdet > 0
      if (filtre === 'azalan') return stok.hazirAdet < ayarlar.dusukStokEsigi
      return true
    })

    return filtreli.sort((a, b) => a.parfumNo - b.parfumNo)
  }, [stokHaritasi, filtre, sorgu, katalogHaritasi, ayarlar.dusukStokEsigi])

  const toplamlar = useMemo(() => {
    let hazir = 0
    let demlenen = 0
    for (const stok of stokHaritasi.values()) {
      hazir += stok.hazirAdet
      demlenen += stok.demlenenAdet
    }
    return { hazir, demlenen }
  }, [stokHaritasi])

  function uretimAc(no?: number) {
    setDuzenlenen(null)
    setOnDolguNo(no)
    setFormAcik(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Envanter</h1>
          <p className="sayi text-sm text-slate-500 dark:text-slate-400">
            {sayi(toplamlar.hazir)} şişe hazır · {sayi(toplamlar.demlenen)} şişe demleniyor
          </p>
        </div>
        <Buton onClick={() => uretimAc()}>
          <ArtiSimgesi className="size-5" />
          <span className="hidden sm:inline">Yeni üretim</span>
          <span className="sm:hidden">Üretim</span>
        </Buton>
      </header>

      <Girdi
        type="search"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder="Parfüm numarası veya kod ara…"
        aria-label="Envanterde ara"
      />

      <Sekmeler
        secili={filtre}
        degisti={setFiltre}
        sekmeler={[
          { deger: 'hepsi', etiket: 'Hepsi' },
          { deger: 'hazir', etiket: 'Sadece hazır olanlar' },
          { deger: 'demlenen', etiket: 'Demlenenler' },
          { deger: 'azalan', etiket: `Stoğu ${ayarlar.dusukStokEsigi}'nin altında` },
        ]}
      />

      {gruplar.length === 0 ? (
        <BosDurum
          simge={<SiseSimgesi className="size-10" />}
          baslik={sorgu || filtre !== 'hepsi' ? 'Eşleşen kayıt yok' : 'Henüz üretim kaydı yok'}
          aciklama="Dolum yaptığınız her parti için bir üretim kaydı ekleyin; demlenme sayacı otomatik başlar."
          eylem={<Buton onClick={() => uretimAc()}>
            <ArtiSimgesi className="size-5" />
            Yeni üretim ekle
          </Buton>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {gruplar.map((stok) => (
            <ParfumGrubu
              key={stok.parfumNo}
              stok={stok}
              kod={katalogHaritasi.get(stok.parfumNo)?.kod}
              aciklama={katalogHaritasi.get(stok.parfumNo)?.aciklama}
              dusukEsik={ayarlar.dusukStokEsigi}
              acik={acikNo === stok.parfumNo}
              acKapat={() => setAcikNo((o) => (o === stok.parfumNo ? null : stok.parfumNo))}
              uret={() => uretimAc(stok.parfumNo)}
              partiDuzenle={(parti) => {
                setDuzenlenen(parti)
                setOnDolguNo(undefined)
                setFormAcik(true)
              }}
              partiSil={setSilinecek}
              qrGoster={setQrParti}
            />
          ))}
        </div>
      )}

      <UretimFormu
        acik={formAcik}
        kapat={() => {
          setFormAcik(false)
          setDuzenlenen(null)
          setOnDolguNo(undefined)
        }}
        duzenlenen={duzenlenen}
        onDolguNo={onDolguNo}
      />

      <QrModal
        uretim={qrParti}
        urun={qrParti ? katalogHaritasi.get(qrParti.parfumNo) : undefined}
        kapat={() => setQrParti(null)}
      />

      <OnayKutusu
        acik={Boolean(silinecek)}
        kapat={() => setSilinecek(null)}
        baslik="Üretim partisini sil"
        tehlikeli
        onayMetni="Sil"
        mesaj={
          silinecek
            ? `No ${silinecek.parfumNo} · ${silinecek.adet} şişelik parti silinecek. Bu partiden düşülmüş sipariş kayıtları etkilenmez.`
            : ''
        }
        onayla={async () => {
          if (!silinecek) return
          await uretimSil(uid, silinecek.id)
          toast.basari('Üretim partisi silindi.')
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------- Parfüm grubu kartı */

interface GrupOzellikleri {
  stok: ParfumStogu
  kod?: string
  aciklama?: string
  dusukEsik: number
  acik: boolean
  acKapat: () => void
  uret: () => void
  partiDuzenle: (parti: Uretim) => void
  partiSil: (parti: Uretim) => void
  qrGoster: (parti: Uretim) => void
}

function ParfumGrubu({
  stok,
  kod,
  aciklama,
  dusukEsik,
  acik,
  acKapat,
  uret,
  partiDuzenle,
  partiSil,
  qrGoster,
}: GrupOzellikleri) {
  // Özet çubuğu: hazır stok varsa yeşil "hazır", yoksa hazır olmaya en yakın parti.
  const enYakin = stok.partiler
    .filter((p) => p.kalanAdet > 0)
    .map((p) => demlenmeDurumu(p))
    .filter((d) => !d.hazir)
    .sort((a, b) => a.kalanGun - b.kalanGun)[0]
  const renk = demlenmeRengi(enYakin?.yuzde ?? 0)
  const dusuk = stok.hazirAdet < dusukEsik

  return (
    <Kart className={birlestir('overflow-hidden', dusuk && 'border-rose-300 dark:border-rose-500/40')}>
      <button type="button" onClick={acKapat} className="block w-full px-4 py-3.5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              No {stok.parfumNo}
              {kod && <span className="ml-2 text-sm font-medium text-slate-400">{kod}</span>}
            </p>
            {aciklama && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{aciklama}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Rozet renk={stok.hazirAdet > 0 ? 'yesil' : 'kirmizi'}>{stok.hazirAdet} hazır</Rozet>
            {stok.demlenenAdet > 0 && <Rozet renk="sari">{stok.demlenenAdet} demleniyor</Rozet>}
          </div>
        </div>

        {stok.hazirAdet > 0 ? (
          <div className="mt-3">
            <IlerlemeCubugu yuzde={100} barSinifi="bg-emerald-500" />
            <p className="mt-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {stok.hazirAdet} şişe satışa hazır
              {enYakin && ` · ${stok.demlenenAdet} şişe ${enYakin.kalanGun} gün sonra hazır`}
            </p>
          </div>
        ) : enYakin ? (
          <div className="mt-3">
            <IlerlemeCubugu yuzde={enYakin.yuzde} barSinifi={renk.bar} />
            <p className={`mt-1.5 text-xs font-semibold ${renk.metin}`}>
              Demlenmesine {enYakin.kalanGun} gün kaldı (%{enYakin.yuzde})
            </p>
          </div>
        ) : null}

        {dusuk && (
          <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            Hazır stok {dusukEsik} adedin altında — üretim planlayın.
          </p>
        )}
      </button>

      {acik && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stok.partiler.length} üretim partisi
            </p>
            <Buton boy="sm" onClick={uret}>
              <ArtiSimgesi className="size-4" />
              Bu numaradan üret
            </Buton>
          </div>
          <div className="flex flex-col gap-3">
            {stok.partiler.map((parti) => (
              <PartiKarti
                key={parti.id}
                uretim={parti}
                duzenle={() => partiDuzenle(parti)}
                sil={() => partiSil(parti)}
                qrGoster={() => qrGoster(parti)}
              />
            ))}
          </div>
        </div>
      )}
    </Kart>
  )
}
