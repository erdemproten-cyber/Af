import { useState, type ReactNode } from 'react'
import { Buton, Modal } from './index'

interface OnayOzellikleri {
  acik: boolean
  kapat: () => void
  baslik: string
  mesaj: ReactNode
  onayla: () => void | Promise<void>
  onayMetni?: string
  tehlikeli?: boolean
}

export function OnayKutusu({
  acik,
  kapat,
  baslik,
  mesaj,
  onayla,
  onayMetni = 'Onayla',
  tehlikeli,
}: OnayOzellikleri) {
  const [calisiyor, setCalisiyor] = useState(false)

  async function calistir() {
    setCalisiyor(true)
    try {
      await onayla()
      kapat()
    } finally {
      setCalisiyor(false)
    }
  }

  return (
    <Modal
      acik={acik}
      kapat={kapat}
      baslik={baslik}
      altBilgi={
        <>
          <Buton tur="ikincil" tamGenislik onClick={kapat}>
            Vazgeç
          </Buton>
          <Buton
            tur={tehlikeli ? 'tehlike' : 'birincil'}
            tamGenislik
            yukleniyor={calisiyor}
            onClick={() => void calistir()}
          >
            {onayMetni}
          </Buton>
        </>
      }
    >
      <div className="text-sm text-slate-600 dark:text-slate-300">{mesaj}</div>
    </Modal>
  )
}
