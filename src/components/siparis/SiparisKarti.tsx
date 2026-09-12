import { Buton, Kart, Rozet, birlestir } from '../ui'
import { KargoSimgesi, ParaSimgesi, UyariSimgesi, WhatsappSimgesi } from '../ui/simgeler'
import type { Siparis } from '../../types'
import { para, tarih, telefonGoster } from '../../lib/format'
import { tarihe } from '../../lib/date'
import { odemeHatirlatmaMesaji, whatsappLinki } from '../../lib/whatsapp'
import { DURUM_RENKLERI, odemeBeklemeGunu } from '../../lib/siparisDurum'

interface Ozellikler {
  siparis: Siparis
  ac: () => void
  kargola?: () => void
  odemeAl?: () => void
  gecikmeEsigi?: number
}

export default function SiparisKarti({ siparis, ac, kargola, odemeAl, gecikmeEsigi = 7 }: Ozellikler) {
  const bekleme = odemeBeklemeGunu(siparis)
  const gecikmis = bekleme !== null && bekleme > gecikmeEsigi && siparis.durum !== 'Yeni'
  const adet = siparis.urunler.reduce((t, u) => t + u.adet, 0)
  const wa = whatsappLinki(siparis.musteri.telefon, odemeHatirlatmaMesaji(siparis))

  return (
    <Kart
      className={birlestir(
        'overflow-hidden transition-shadow hover:shadow-md',
        gecikmis && 'border-rose-300 dark:border-rose-500/50',
      )}
    >
      <button type="button" onClick={ac} className="block w-full px-4 py-3.5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-50">
              {siparis.musteri.ad || 'İsimsiz müşteri'}
            </p>
            <p className="sayi mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {siparis.siparisNo} · {tarih(tarihe(siparis.siparisTarihi))}
              {siparis.musteri.telefon && ` · ${telefonGoster(siparis.musteri.telefon)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Rozet renk={DURUM_RENKLERI[siparis.durum]}>{siparis.durum}</Rozet>
            <span className="sayi text-base font-bold text-slate-900 dark:text-slate-50">
              {para(siparis.toplamTutar)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {siparis.urunler.slice(0, 4).map((u, i) => (
            <Rozet key={`${u.parfumNo}-${i}`} renk="notr">
              {u.kod || `No ${u.parfumNo}`} × {u.adet}
            </Rozet>
          ))}
          {siparis.urunler.length > 4 && <Rozet renk="notr">+{siparis.urunler.length - 4}</Rozet>}
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{adet} şişe</span>
        </div>

        {gecikmis && (
          <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <UyariSimgesi className="size-4 shrink-0" />
            {bekleme} gündür ödeme alınmadı
          </p>
        )}
      </button>

      {(kargola || odemeAl) && siparis.durum !== 'İptal' && !siparis.arsiv && (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {kargola && siparis.durum !== 'Kargolandı' && siparis.durum !== 'Teslim Edildi' && (
            <Buton tur="ikincil" boy="sm" className="flex-1" onClick={kargola}>
              <KargoSimgesi className="size-4" />
              Kargola
            </Buton>
          )}
          {gecikmis && wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <WhatsappSimgesi className="size-4" />
              Hatırlat
            </a>
          )}
          {odemeAl && (
            <Buton tur="basari" boy="sm" className="flex-1" onClick={odemeAl}>
              <ParaSimgesi className="size-4" />
              Ödeme alındı
            </Buton>
          )}
        </div>
      )}
    </Kart>
  )
}
