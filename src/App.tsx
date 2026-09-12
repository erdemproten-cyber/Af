import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useVeri } from './context/DataContext'
import Layout from './components/Layout'
import Giris from './pages/Giris'
import { Bekleme } from './components/ui'

const Panel = lazy(() => import('./pages/Panel'))
const Siparisler = lazy(() => import('./pages/Siparisler'))
const Envanter = lazy(() => import('./pages/Envanter'))
const Arsiv = lazy(() => import('./pages/Arsiv'))
const Musteriler = lazy(() => import('./pages/Musteriler'))
const Raporlar = lazy(() => import('./pages/Raporlar'))
const Ayarlar = lazy(() => import('./pages/Ayarlar'))

function TamEkranBekleme({ mesaj }: { mesaj: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      <Bekleme className="size-8 text-marka-500" />
      <p className="text-sm font-medium">{mesaj}</p>
    </div>
  )
}

export default function App() {
  const { kullanici, yukleniyor } = useAuth()
  const { yukleniyor: veriYukleniyor } = useVeri()

  if (yukleniyor) return <TamEkranBekleme mesaj="Oturum kontrol ediliyor…" />
  if (!kullanici) return <Giris />
  if (veriYukleniyor) return <TamEkranBekleme mesaj="Veriler yükleniyor…" />

  return (
    <Suspense fallback={<TamEkranBekleme mesaj="Yükleniyor…" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Panel />} />
          <Route path="siparisler" element={<Siparisler />} />
          <Route path="envanter" element={<Envanter />} />
          <Route path="arsiv" element={<Arsiv />} />
          <Route path="musteriler" element={<Musteriler />} />
          <Route path="raporlar" element={<Raporlar />} />
          <Route path="ayarlar" element={<Ayarlar />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
