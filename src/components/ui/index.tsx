import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export function birlestir(...siniflar: Array<string | false | null | undefined>): string {
  return siniflar.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ Buton */

type ButonTuru = 'birincil' | 'ikincil' | 'sessiz' | 'tehlike' | 'basari'
type ButonBoyu = 'sm' | 'md' | 'lg'

const BUTON_STILLERI: Record<ButonTuru, string> = {
  birincil:
    'bg-marka-500 text-white hover:bg-marka-600 active:bg-marka-700 disabled:bg-marka-500/50',
  ikincil:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700',
  sessiz:
    'bg-transparent text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800',
  tehlike: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  basari: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
}

const BUTON_BOYLARI: Record<ButonBoyu, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-5 text-base gap-2',
}

interface ButonOzellikleri extends ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: ButonTuru
  boy?: ButonBoyu
  tamGenislik?: boolean
  yukleniyor?: boolean
}

export function Buton({
  tur = 'birincil',
  boy = 'md',
  tamGenislik,
  yukleniyor,
  className,
  children,
  disabled,
  ...kalan
}: ButonOzellikleri) {
  return (
    <button
      type="button"
      disabled={disabled || yukleniyor}
      className={birlestir(
        'inline-flex touch-manipulation items-center justify-center rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        BUTON_STILLERI[tur],
        BUTON_BOYLARI[boy],
        tamGenislik && 'w-full',
        className,
      )}
      {...kalan}
    >
      {yukleniyor && <Bekleme />}
      {children}
    </button>
  )
}

export function Bekleme({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={birlestir(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}

/* ------------------------------------------------------------------ Alanlar */

interface AlanOzellikleri {
  etiket?: string
  ipucu?: string
  hata?: string
  children: ReactNode
  kimlik?: string
  className?: string
}

export function Alan({ etiket, ipucu, hata, children, kimlik, className }: AlanOzellikleri) {
  return (
    <div className={birlestir('flex flex-col gap-1.5', className)}>
      {etiket && (
        <label htmlFor={kimlik} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {etiket}
        </label>
      )}
      {children}
      {hata ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{hata}</p>
      ) : ipucu ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{ipucu}</p>
      ) : null}
    </div>
  )
}

const GIRDI_STILI =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-marka-500 focus:ring-2 focus:ring-marka-500/30 focus:outline-none ' +
  'disabled:bg-slate-100 disabled:text-slate-500 ' +
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800'

interface GirdiOzellikleri extends InputHTMLAttributes<HTMLInputElement> {
  etiket?: string
  ipucu?: string
  hataMetni?: string
  sarmalayiciSinifi?: string
}

export function Girdi({ etiket, ipucu, hataMetni, className, sarmalayiciSinifi, ...kalan }: GirdiOzellikleri) {
  const olusanId = useId()
  const kimlik = kalan.id ?? olusanId
  return (
    <Alan etiket={etiket} ipucu={ipucu} hata={hataMetni} kimlik={kimlik} className={sarmalayiciSinifi}>
      <input
        id={kimlik}
        className={birlestir(GIRDI_STILI, hataMetni && 'border-rose-500', className)}
        {...kalan}
      />
    </Alan>
  )
}

interface SecimOzellikleri extends SelectHTMLAttributes<HTMLSelectElement> {
  etiket?: string
  ipucu?: string
  secenekler: Array<{ deger: string; etiket: string }>
  sarmalayiciSinifi?: string
}

export function Secim({ etiket, ipucu, secenekler, className, sarmalayiciSinifi, ...kalan }: SecimOzellikleri) {
  const olusanId = useId()
  const kimlik = kalan.id ?? olusanId
  return (
    <Alan etiket={etiket} ipucu={ipucu} kimlik={kimlik} className={sarmalayiciSinifi}>
      <select id={kimlik} className={birlestir(GIRDI_STILI, 'pr-8', className)} {...kalan}>
        {secenekler.map((s) => (
          <option key={s.deger} value={s.deger}>
            {s.etiket}
          </option>
        ))}
      </select>
    </Alan>
  )
}

interface MetinKutusuOzellikleri extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiket?: string
  ipucu?: string
  sarmalayiciSinifi?: string
}

export function MetinKutusu({ etiket, ipucu, className, sarmalayiciSinifi, ...kalan }: MetinKutusuOzellikleri) {
  const olusanId = useId()
  const kimlik = kalan.id ?? olusanId
  return (
    <Alan etiket={etiket} ipucu={ipucu} kimlik={kimlik} className={sarmalayiciSinifi}>
      <textarea
        id={kimlik}
        rows={3}
        className={birlestir(GIRDI_STILI, 'h-auto py-2.5 leading-relaxed', className)}
        {...kalan}
      />
    </Alan>
  )
}

/* ------------------------------------------------------------------ Kart & rozet */

export function Kart({
  className,
  children,
  ...kalan
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={birlestir(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...kalan}
    >
      {children}
    </div>
  )
}

type RozetRengi = 'notr' | 'mavi' | 'yesil' | 'sari' | 'kirmizi' | 'mor'

const ROZET_STILLERI: Record<RozetRengi, string> = {
  notr: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  mavi: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  yesil: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  sari: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  kirmizi: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  mor: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
}

export function Rozet({
  renk = 'notr',
  children,
  className,
}: {
  renk?: RozetRengi
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={birlestir(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        ROZET_STILLERI[renk],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Modal */

interface ModalOzellikleri {
  acik: boolean
  kapat: () => void
  baslik: string
  aciklama?: string
  children: ReactNode
  altBilgi?: ReactNode
  genis?: boolean
}

export function Modal({ acik, kapat, baslik, aciklama, children, altBilgi, genis }: ModalOzellikleri) {
  const kutuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!acik) return
    const escDinle = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') kapat()
    }
    document.addEventListener('keydown', escDinle)
    const oncekiTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    kutuRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', escDinle)
      document.body.style.overflow = oncekiTasma
    }
  }, [acik, kapat])

  if (!acik) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={kapat}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
        tabIndex={-1}
        className={birlestir(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-slate-50 shadow-2xl',
          'sm:max-h-[88dvh] sm:rounded-3xl dark:bg-slate-950',
          genis ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{baslik}</h2>
            {aciklama && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{aciklama}</p>}
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="-mr-1 rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {altBilgi && (
          <footer className="guvenli-alt flex gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            {altBilgi}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Diğer */

export function BosDurum({
  baslik,
  aciklama,
  eylem,
  simge,
}: {
  baslik: string
  aciklama?: string
  eylem?: ReactNode
  simge?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      {simge && <div className="text-slate-400 dark:text-slate-600">{simge}</div>}
      <p className="font-semibold text-slate-700 dark:text-slate-200">{baslik}</p>
      {aciklama && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{aciklama}</p>}
      {eylem}
    </div>
  )
}

export function Sekmeler<T extends string>({
  sekmeler,
  secili,
  degisti,
}: {
  sekmeler: Array<{ deger: T; etiket: string; sayi?: number }>
  secili: T
  degisti: (deger: T) => void
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex w-max gap-2" role="tablist">
        {sekmeler.map((sekme) => (
          <button
            key={sekme.deger}
            type="button"
            role="tab"
            aria-selected={secili === sekme.deger}
            onClick={() => degisti(sekme.deger)}
            className={birlestir(
              'flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors',
              secili === sekme.deger
                ? 'bg-slate-900 text-white dark:bg-marka-500 dark:text-slate-950'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800',
            )}
          >
            {sekme.etiket}
            {sekme.sayi !== undefined && (
              <span
                className={birlestir(
                  'sayi rounded-full px-1.5 py-0.5 text-[11px]',
                  secili === sekme.deger
                    ? 'bg-white/20 dark:bg-slate-950/20'
                    : 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                {sekme.sayi}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function IlerlemeCubugu({
  yuzde,
  barSinifi,
  className,
}: {
  yuzde: number
  barSinifi: string
  className?: string
}) {
  return (
    <div
      className={birlestir('h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800', className)}
      role="progressbar"
      aria-valuenow={yuzde}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={birlestir('h-full rounded-full transition-[width] duration-500', barSinifi)}
        style={{ width: `${Math.max(2, Math.min(100, yuzde))}%` }}
      />
    </div>
  )
}
