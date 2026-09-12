import { useEffect, useState } from 'react'
import { Buton, Girdi, Modal, Secim } from '../ui'
import { useUid, useVeri } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { kargola, odemeAl } from '../../services/siparis'
import { ODEME_YONTEMLERI, type OdemeYontemi, type Siparis } from '../../types'
import { girdiTarihi, girdidenTarih, para } from '../../lib/format'
import { kargoTakipLinki } from '../../lib/kargo'
import { kargoMesaji, whatsappLinki } from '../../lib/whatsapp'
import { WhatsappSimgesi } from '../ui/simgeler'

/* ----------------------------------------------------------------- Kargola */

export function KargoModal({
  siparis,
  kapat,
}: {
  siparis: Siparis | null
  kapat: () => void
}) {
  const uid = useUid()
  const { ayarlar } = useVeri()
  const toast = useToast()
  const [tarih, setTarih] = useState(girdiTarihi(new Date()))
  const [firma, setFirma] = useState('')
  const [takipNo, setTakipNo] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (!siparis) return
    setTarih(girdiTarihi(new Date()))
    setFirma(siparis.kargoFirmasi || ayarlar.kargoFirmalari[0] || '')
    setTakipNo(siparis.kargoTakipNo || '')
  }, [siparis, ayarlar.kargoFirmalari])

  if (!siparis) return null

  const link = kargoTakipLinki(firma, takipNo)

  async function kaydet(whatsappAc: boolean) {
    if (!siparis) return
    setKaydediliyor(true)
    try {
      await kargola(uid, siparis.id, { tarih: girdidenTarih(tarih), firma, takipNo: takipNo.trim() })
      toast.basari(`${siparis.siparisNo} kargolandı olarak işaretlendi.`)
      if (whatsappAc) {
        const wa = whatsappLinki(
          siparis.musteri.telefon,
          kargoMesaji({ ...siparis, kargoFirmasi: firma, kargoTakipNo: takipNo.trim() }),
        )
        if (wa) window.open(wa, '_blank', 'noopener')
        else toast.uyari('Müşterinin telefon numarası kayıtlı değil.')
      }
      kapat()
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'Kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <Modal
      acik
      kapat={kapat}
      baslik="Kargola"
      aciklama={`${siparis.siparisNo} · ${siparis.musteri.ad || 'İsimsiz müşteri'}`}
      altBilgi={
        <>
          <Buton tur="ikincil" tamGenislik onClick={kapat}>
            Vazgeç
          </Buton>
          <Buton tamGenislik yukleniyor={kaydediliyor} onClick={() => void kaydet(false)}>
            Kaydet
          </Buton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Girdi etiket="Kargo tarihi" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        <Secim
          etiket="Kargo firması"
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
          secenekler={[
            { deger: '', etiket: 'Seçiniz…' },
            ...ayarlar.kargoFirmalari.map((k) => ({ deger: k, etiket: k })),
          ]}
        />
        <Girdi
          etiket="Takip numarası"
          value={takipNo}
          onChange={(e) => setTakipNo(e.target.value)}
          placeholder="Örn. 1234567890"
          ipucu={link ? 'Takip bağlantısı otomatik oluşturuldu.' : undefined}
        />

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium text-marka-600 underline-offset-4 hover:underline dark:text-marka-400"
          >
            {link}
          </a>
        )}

        <Buton tur="basari" tamGenislik yukleniyor={kaydediliyor} onClick={() => void kaydet(true)}>
          <WhatsappSimgesi className="size-5" />
          Kaydet ve WhatsApp'tan bildir
        </Buton>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------- Ödeme aldım */

export function OdemeModal({ siparis, kapat }: { siparis: Siparis | null; kapat: () => void }) {
  const uid = useUid()
  const toast = useToast()
  const [tarih, setTarih] = useState(girdiTarihi(new Date()))
  const [yontem, setYontem] = useState<OdemeYontemi>('Havale/EFT')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (!siparis) return
    setTarih(girdiTarihi(new Date()))
    setYontem(siparis.odemeYontemi)
  }, [siparis])

  if (!siparis) return null

  async function kaydet() {
    if (!siparis) return
    setKaydediliyor(true)
    try {
      await odemeAl(uid, siparis.id, { tarih: girdidenTarih(tarih), yontem })
      toast.basari(`${siparis.siparisNo} ödendi olarak işaretlendi ve arşive taşındı.`)
      kapat()
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'Kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <Modal
      acik
      kapat={kapat}
      baslik="Ödeme alındı"
      aciklama={`${siparis.siparisNo} · ${para(siparis.toplamTutar)}`}
      altBilgi={
        <>
          <Buton tur="ikincil" tamGenislik onClick={kapat}>
            Vazgeç
          </Buton>
          <Buton tur="basari" tamGenislik yukleniyor={kaydediliyor} onClick={() => void kaydet()}>
            Onayla ve arşivle
          </Buton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Girdi etiket="Ödeme tarihi" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        <Secim
          etiket="Ödeme yöntemi"
          value={yontem}
          onChange={(e) => setYontem(e.target.value as OdemeYontemi)}
          secenekler={ODEME_YONTEMLERI.map((o) => ({ deger: o, etiket: o }))}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ödeme kaydedildiğinde sipariş otomatik olarak arşive taşınır. Arşivden geri almak için sipariş
          detayındaki “Arşivden çıkar” düğmesini kullanabilirsiniz.
        </p>
      </div>
    </Modal>
  )
}
