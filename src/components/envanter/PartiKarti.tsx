import { Buton, IlerlemeCubugu, Kart, Rozet } from '../ui'
import { KalemSimgesi, KaresizSimgesi, CopSimgesi } from '../ui/simgeler'
import type { Uretim } from '../../types'
import { demlenmeDurumu, demlenmeRengi } from '../../lib/demlenme'
import { para, sayi, tarih } from '../../lib/format'

interface Ozellikler {
  uretim: Uretim
  duzenle: () => void
  sil: () => void
  qrGoster: () => void
}

export default function PartiKarti({ uretim, duzenle, sil, qrGoster }: Ozellikler) {
  const durum = demlenmeDurumu(uretim)
  const renk = demlenmeRengi(durum.yuzde)

  return (
    <Kart className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sayi font-semibold text-slate-900 dark:text-slate-100">
            {sayi(uretim.kalanAdet)} / {sayi(uretim.adet)} şişe · {uretim.hacimMl} ml
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Üretim: {tarih(durum.uretimTarihi)} · Bitiş: {tarih(durum.bitisTarihi)}
          </p>
        </div>
        {durum.hazir ? (
          <Rozet renk="yesil">Hazır</Rozet>
        ) : (
          <Rozet renk={durum.yuzde >= 50 ? 'sari' : 'kirmizi'}>%{durum.yuzde}</Rozet>
        )}
      </div>

      <div className="mt-3">
        <IlerlemeCubugu yuzde={durum.yuzde} barSinifi={renk.bar} />
        <p className={`mt-1.5 text-xs font-semibold ${renk.metin}`}>
          {durum.hazir
            ? 'Demlenmesi tamamlandı, satışa hazır'
            : `Demlenmesine ${durum.kalanGun} gün kaldı`}
        </p>
      </div>

      {(uretim.esanslar.length > 0 || uretim.notlar || uretim.maliyet > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {uretim.esanslar.map((esans, i) => (
            <Rozet key={i} renk="notr">
              {esans.ad}
              {esans.oran && ` ${esans.oran}`}
            </Rozet>
          ))}
          {uretim.maliyet > 0 && (
            <Rozet renk="mavi">Şişe başı {para(uretim.maliyet / Math.max(1, uretim.adet))}</Rozet>
          )}
        </div>
      )}

      {uretim.notlar && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{uretim.notlar}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Buton tur="ikincil" boy="sm" onClick={duzenle} className="flex-1">
          <KalemSimgesi className="size-4" />
          Düzenle
        </Buton>
        <Buton tur="ikincil" boy="sm" onClick={qrGoster} aria-label="QR etiketi">
          <KaresizSimgesi className="size-4" />
          QR
        </Buton>
        <Buton tur="sessiz" boy="sm" onClick={sil} aria-label="Partiyi sil">
          <CopSimgesi className="size-4" />
        </Buton>
      </div>
    </Kart>
  )
}
