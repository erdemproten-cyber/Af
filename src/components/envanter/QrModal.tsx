import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Buton, Modal } from '../ui'
import type { KatalogUrun, Uretim } from '../../types'
import { tarih } from '../../lib/format'
import { tarihe } from '../../lib/date'

/**
 * Üretim partisi için QR etiketi. QR içeriği uygulamanın parti bağlantısıdır:
 * telefondan okutulduğunda doğrudan o partinin kartı açılır.
 */
export default function QrModal({
  uretim,
  urun,
  kapat,
}: {
  uretim: Uretim | null
  urun?: KatalogUrun
  kapat: () => void
}) {
  const [veriUrl, setVeriUrl] = useState('')

  const hedef = uretim ? `${window.location.origin}/envanter?parti=${uretim.id}` : ''

  useEffect(() => {
    if (!uretim) return
    let iptal = false
    void QRCode.toDataURL(hedef, { width: 512, margin: 1, errorCorrectionLevel: 'M' }).then((url) => {
      if (!iptal) setVeriUrl(url)
    })
    return () => {
      iptal = true
    }
  }, [uretim, hedef])

  if (!uretim) return null

  function yazdir() {
    const pencere = window.open('', '_blank', 'width=420,height=560')
    if (!pencere || !uretim) return
    pencere.document.write(`
      <html lang="tr"><head><title>Etiket ${uretim.parfumNo}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:24px}
        img{width:220px;height:220px}
        h1{font-size:28px;margin:8px 0 0}
        p{margin:2px 0;color:#475569;font-size:14px}
      </style></head><body>
      <img src="${veriUrl}" alt="QR" />
      <h1>No ${uretim.parfumNo}</h1>
      <p>${urun?.kod ?? ''}</p>
      <p>Üretim: ${tarih(tarihe(uretim.uretimTarihi))}</p>
      <p>Demlenme bitişi: ${tarih(tarihe(uretim.demlenmeBitis))}</p>
      <p>${uretim.hacimMl} ml · ${uretim.adet} şişe</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`)
    pencere.document.close()
  }

  return (
    <Modal
      acik
      kapat={kapat}
      baslik={`No ${uretim.parfumNo} · QR etiketi`}
      aciklama="Şişeye yapıştırın; telefondan okutunca bu parti açılır."
      altBilgi={
        <>
          <Buton tur="ikincil" tamGenislik onClick={kapat}>
            Kapat
          </Buton>
          <Buton tamGenislik onClick={yazdir} disabled={!veriUrl}>
            Yazdır
          </Buton>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3">
        {veriUrl ? (
          <img src={veriUrl} alt="Parti QR kodu" className="size-56 rounded-xl bg-white p-2" />
        ) : (
          <div className="size-56 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        )}
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
            No {uretim.parfumNo} {urun?.kod ? `· ${urun.kod}` : ''}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Üretim {tarih(tarihe(uretim.uretimTarihi))} · Bitiş {tarih(tarihe(uretim.demlenmeBitis))}
          </p>
        </div>
      </div>
    </Modal>
  )
}
