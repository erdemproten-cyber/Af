import { useEffect } from 'react'
import { useVeri } from './DataContext'

/** Ayarlardaki tema tercihini <html> sınıfına uygular. */
export function TemaUygulayici() {
  const { ayarlar } = useVeri()
  const tema = ayarlar.tema

  useEffect(() => {
    const kok = document.documentElement
    const sistem = window.matchMedia('(prefers-color-scheme: dark)')

    const uygula = () => {
      const koyu = tema === 'koyu' || (tema === 'sistem' && sistem.matches)
      kok.classList.toggle('dark', koyu)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', koyu ? '#0f172a' : '#f1f5f9')
    }

    uygula()
    if (tema === 'sistem') {
      sistem.addEventListener('change', uygula)
      return () => sistem.removeEventListener('change', uygula)
    }
  }, [tema])

  return null
}
