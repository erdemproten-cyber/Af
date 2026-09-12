import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastTuru = 'bilgi' | 'basari' | 'uyari' | 'hata'

interface Toast {
  id: number
  tur: ToastTuru
  mesaj: string
}

interface ToastDegeri {
  bildir: (mesaj: string, tur?: ToastTuru) => void
  basari: (mesaj: string) => void
  hata: (mesaj: string) => void
  uyari: (mesaj: string) => void
}

const ToastContext = createContext<ToastDegeri | null>(null)

const STILLER: Record<ToastTuru, string> = {
  bilgi: 'bg-slate-800 text-white dark:bg-slate-700',
  basari: 'bg-emerald-600 text-white',
  uyari: 'bg-amber-500 text-slate-900',
  hata: 'bg-rose-600 text-white',
}

let sayac = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastlar, setToastlar] = useState<Toast[]>([])

  const bildir = useCallback((mesaj: string, tur: ToastTuru = 'bilgi') => {
    const id = ++sayac
    setToastlar((onceki) => [...onceki, { id, tur, mesaj }])
    setTimeout(() => setToastlar((onceki) => onceki.filter((t) => t.id !== id)), tur === 'hata' ? 6000 : 3500)
  }, [])

  const deger = useMemo<ToastDegeri>(
    () => ({
      bildir,
      basari: (m) => bildir(m, 'basari'),
      hata: (m) => bildir(m, 'hata'),
      uyari: (m) => bildir(m, 'uyari'),
    }),
    [bildir],
  )

  return (
    <ToastContext value={deger}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toastlar.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${STILLER[toast.tur]}`}
          >
            {toast.mesaj}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastDegeri {
  const deger = useContext(ToastContext)
  if (!deger) throw new Error('useToast yalnızca ToastProvider içinde kullanılabilir')
  return deger
}
