import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVeri } from '../context/DataContext'
import { birlestir } from './ui'
import {
  ArsivSimgesi,
  AyarSimgesi,
  CikisSimgesi,
  KisiSimgesi,
  PanelSimgesi,
  RaporSimgesi,
  SiparisSimgesi,
  SiseSimgesi,
} from './ui/simgeler'
import type { ComponentType, SVGProps } from 'react'

interface MenuOgesi {
  yol: string
  etiket: string
  Simge: ComponentType<SVGProps<SVGSVGElement>>
  /** Mobil alt menüde gösterilsin mi? (alt menüde 5 öğe var) */
  altMenu?: boolean
}

const MENU: MenuOgesi[] = [
  { yol: '/', etiket: 'Panel', Simge: PanelSimgesi, altMenu: true },
  { yol: '/siparisler', etiket: 'Siparişler', Simge: SiparisSimgesi, altMenu: true },
  { yol: '/envanter', etiket: 'Envanter', Simge: SiseSimgesi, altMenu: true },
  { yol: '/arsiv', etiket: 'Arşiv', Simge: ArsivSimgesi, altMenu: true },
  { yol: '/musteriler', etiket: 'Müşteriler', Simge: KisiSimgesi },
  { yol: '/raporlar', etiket: 'Raporlar', Simge: RaporSimgesi },
  { yol: '/ayarlar', etiket: 'Ayarlar', Simge: AyarSimgesi, altMenu: true },
]

export default function Layout() {
  const { cikisYap, kullanici } = useAuth()
  const { cevrimdisi, siparisler } = useVeri()

  const bekleyen = siparisler.filter(
    (s) => !s.arsiv && (s.durum === 'Yeni' || s.durum === 'Hazırlanıyor'),
  ).length

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950">
      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-marka-500 text-slate-950">
            <SiseSimgesi className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-50">Parfüm Takip</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{kullanici?.email}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {MENU.map(({ yol, etiket, Simge }) => (
            <NavLink
              key={yol}
              to={yol}
              end={yol === '/'}
              className={({ isActive }) =>
                birlestir(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-marka-500 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <Simge className="size-5 shrink-0" />
              <span className="flex-1">{etiket}</span>
              {yol === '/siparisler' && bekleyen > 0 && (
                <span className="sayi rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {bekleyen}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => void cikisYap()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <CikisSimgesi className="size-5" />
          Çıkış yap
        </button>
      </aside>

      <div className="lg:pl-60">
        {cevrimdisi && (
          <div className="guvenli-ust sticky top-0 z-20 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-slate-950">
            Çevrimdışısınız — değişiklikler bağlantı gelince gönderilecek.
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobil alt menü */}
      <nav className="guvenli-alt fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-lg">
          {MENU.filter((m) => m.altMenu).map(({ yol, etiket, Simge }) => (
            <NavLink
              key={yol}
              to={yol}
              end={yol === '/'}
              className={({ isActive }) =>
                birlestir(
                  'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-marka-600 dark:text-marka-400' : 'text-slate-500 dark:text-slate-400',
                )
              }
            >
              <Simge className="size-6" />
              {etiket}
              {yol === '/siparisler' && bekleyen > 0 && (
                <span className="sayi absolute top-1.5 right-[22%] rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {bekleyen}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
