import { useMemo, useRef, useState } from 'react'
import type { KatalogUrun } from '../types'
import { aramaMetni, para } from '../lib/format'
import { birlestir } from './ui'

interface Ozellikler {
  katalog: KatalogUrun[]
  deger: string
  degisti: (deger: string) => void
  secildi: (urun: KatalogUrun) => void
  yerTutucu?: string
  className?: string
  id?: string
}

/**
 * Parfüm numarası/kodu yazınca katalogdan otomatik tamamlama yapan alan.
 * Serbest metin girişine de izin verir (katalogda olmayan numara yazılabilir).
 */
export default function ParfumSecici({
  katalog,
  deger,
  degisti,
  secildi,
  yerTutucu = 'No veya kod',
  className,
  id,
}: Ozellikler) {
  const [acik, setAcik] = useState(false)
  const [vurgulu, setVurgulu] = useState(0)
  const kapatmaZamani = useRef<number | undefined>(undefined)

  const oneriler = useMemo(() => {
    const sorgu = aramaMetni(deger)
    if (!sorgu) return katalog.filter((u) => u.aktif).slice(0, 8)
    return katalog
      .filter((u) => u.aktif)
      .filter(
        (u) =>
          String(u.no).startsWith(sorgu) ||
          aramaMetni(u.kod).includes(sorgu) ||
          aramaMetni(u.aciklama).includes(sorgu),
      )
      .slice(0, 8)
  }, [katalog, deger])

  function sec(urun: KatalogUrun) {
    secildi(urun)
    setAcik(false)
  }

  return (
    <div className="relative">
      <input
        id={id}
        value={deger}
        inputMode="numeric"
        autoComplete="off"
        placeholder={yerTutucu}
        onChange={(e) => {
          degisti(e.target.value)
          setAcik(true)
          setVurgulu(0)
        }}
        onFocus={() => setAcik(true)}
        onBlur={() => {
          kapatmaZamani.current = window.setTimeout(() => setAcik(false), 120)
        }}
        onKeyDown={(olay) => {
          if (!acik || oneriler.length === 0) return
          if (olay.key === 'ArrowDown') {
            olay.preventDefault()
            setVurgulu((v) => (v + 1) % oneriler.length)
          } else if (olay.key === 'ArrowUp') {
            olay.preventDefault()
            setVurgulu((v) => (v - 1 + oneriler.length) % oneriler.length)
          } else if (olay.key === 'Enter') {
            olay.preventDefault()
            sec(oneriler[vurgulu])
          } else if (olay.key === 'Escape') {
            setAcik(false)
          }
        }}
        className={birlestir(
          'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900',
          'focus:border-marka-500 focus:ring-2 focus:ring-marka-500/30 focus:outline-none',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          className,
        )}
      />

      {acik && oneriler.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {oneriler.map((urun, i) => (
            <li key={urun.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  window.clearTimeout(kapatmaZamani.current)
                  sec(urun)
                }}
                className={birlestir(
                  'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm',
                  i === vurgulu
                    ? 'bg-slate-100 dark:bg-slate-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/60',
                )}
              >
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {urun.no} · {urun.kod}
                  </span>
                  {urun.aciklama && (
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {urun.aciklama}
                    </span>
                  )}
                </span>
                <span className="sayi shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {para(urun.varsayilanFiyat)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
