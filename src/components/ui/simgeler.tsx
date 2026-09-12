import type { SVGProps } from 'react'

type SimgeOzellikleri = SVGProps<SVGSVGElement>

function Temel({ children, ...kalan }: SimgeOzellikleri) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...kalan}
    >
      {children}
    </svg>
  )
}

export const PanelSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Temel>
)

export const SiparisSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M6 2h9l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
    <path d="M14 2v5h5" />
    <path d="M8 13h8M8 17h5" />
  </Temel>
)

export const SiseSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <rect x="9" y="2" width="6" height="3.5" rx="1" />
    <path d="M10.5 5.5v2.2c0 .7-.3 1.3-.9 1.7A4.5 4.5 0 0 0 7.5 13v6a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-6a4.5 4.5 0 0 0-2.1-3.6c-.6-.4-.9-1-.9-1.7V5.5" />
    <path d="M9.5 14h5" />
  </Temel>
)

export const ArsivSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
    <path d="M10 12h4" />
  </Temel>
)

export const AyarSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Temel>
)

export const RaporSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15l3.5-4 3 2.5L20 7" />
  </Temel>
)

export const KisiSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Temel>
)

export const ArtiSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M12 5v14M5 12h14" />
  </Temel>
)

export const AramaSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Temel>
)

export const KargoSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M3 7h11v10H3z" />
    <path d="M14 10h4l3 3v4h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Temel>
)

export const ParaSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Temel>
)

export const UyariSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Temel>
)

export const SaatSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Temel>
)

export const WhatsappSimgesi = (p: SimgeOzellikleri) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28Z" />
  </svg>
)

export const IndirSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </Temel>
)

export const YuklemeSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M12 20V8" />
    <path d="m7 12 5-5 5 5" />
    <path d="M4 4h16" />
  </Temel>
)

export const KaresizSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
  </Temel>
)

export const CopSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
    <path d="M10 11v6M14 11v6" />
  </Temel>
)

export const KalemSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Temel>
)

export const OnaySimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="m5 13 4 4L19 7" />
  </Temel>
)

export const CikisSimgesi = (p: SimgeOzellikleri) => (
  <Temel {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8 6 12l4 4" />
    <path d="M6 12h10" />
  </Temel>
)
