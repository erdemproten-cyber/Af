import { useState } from 'react'
import { Buton, Kart, Modal, Rozet, Secim } from '../ui'
import { OnayKutusu } from '../ui/Onay'
import { DURUM_RENKLERI } from '../../lib/siparisDurum'
import {
  CopSimgesi,
  KalemSimgesi,
  KargoSimgesi,
  ParaSimgesi,
  WhatsappSimgesi,
} from '../ui/simgeler'
import { SIPARIS_DURUMLARI, type Siparis, type SiparisDurumu } from '../../types'
import { para, tarih, telefonGoster, telefonNormalize } from '../../lib/format'
import { tarihe } from '../../lib/date'
import { kargoTakipLinki } from '../../lib/kargo'
import { kargoMesaji, siparisOzetMesaji, whatsappLinki } from '../../lib/whatsapp'
import { arsivDurumu, durumGuncelle, siparisIptal, siparisSil } from '../../services/siparis'
import { useUid } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'

interface Ozellikler {
  siparis: Siparis | null
  kapat: () => void
  kargolaAc: (siparis: Siparis) => void
  odemeAc: (siparis: Siparis) => void
  duzenleAc: (siparis: Siparis) => void
}

function Satir({ etiket, deger }: { etiket: string; deger: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{etiket}</span>
      <span className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{deger}</span>
    </div>
  )
}

export default function SiparisDetay({ siparis, kapat, kargolaAc, odemeAc, duzenleAc }: Ozellikler) {
  const uid = useUid()
  const toast = useToast()
  const [iptalAcik, setIptalAcik] = useState(false)
  const [silAcik, setSilAcik] = useState(false)

  if (!siparis) return null

  const takipLinki = kargoTakipLinki(siparis.kargoFirmasi, siparis.kargoTakipNo)
  const telefon = telefonNormalize(siparis.musteri.telefon)
  const waOzet = whatsappLinki(siparis.musteri.telefon, siparisOzetMesaji(siparis))
  const waKargo = siparis.kargoTakipNo
    ? whatsappLinki(siparis.musteri.telefon, kargoMesaji(siparis))
    : null

  async function durumDegistir(durum: SiparisDurumu) {
    if (!siparis) return
    try {
      await durumGuncelle(uid, siparis.id, durum)
      toast.basari(`Durum "${durum}" olarak güncellendi.`)
    } catch (e) {
      toast.hata((e as Error)?.message ?? 'Güncellenemedi.')
    }
  }

  return (
    <>
      <Modal
        acik
        kapat={kapat}
        genis
        baslik={siparis.siparisNo}
        aciklama={`${siparis.kaynak} · ${tarih(tarihe(siparis.siparisTarihi))}`}
        altBilgi={
          <>
            <Buton tur="ikincil" onClick={() => duzenleAc(siparis)} className="flex-1 sm:flex-none">
              <KalemSimgesi className="size-4" />
              Düzenle
            </Buton>
            {!siparis.arsiv && siparis.durum !== 'İptal' && (
              <>
                <Buton tur="ikincil" onClick={() => kargolaAc(siparis)} className="flex-1 sm:flex-none">
                  <KargoSimgesi className="size-4" />
                  Kargola
                </Buton>
                <Buton tur="basari" onClick={() => odemeAc(siparis)} className="flex-1 sm:flex-none">
                  <ParaSimgesi className="size-4" />
                  Ödeme alındı
                </Buton>
              </>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Rozet renk={DURUM_RENKLERI[siparis.durum]}>{siparis.durum}</Rozet>
            {siparis.arsiv && <Rozet renk="notr">Arşivde</Rozet>}
            {siparis.shopierSiparisId && <Rozet renk="mor">Shopier #{siparis.shopierSiparisId}</Rozet>}
            <span className="sayi ml-auto text-xl font-bold text-slate-900 dark:text-slate-50">
              {para(siparis.toplamTutar)}
            </span>
          </div>

          {/* Ürünler */}
          <Kart className="divide-y divide-slate-100 dark:divide-slate-800">
            {siparis.urunler.map((urun, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {urun.kod || `No ${urun.parfumNo}`}
                  </p>
                  <p className="sayi text-xs text-slate-500 dark:text-slate-400">
                    No {urun.parfumNo} · {urun.adet} × {para(urun.birimFiyat)}
                  </p>
                </div>
                <span className="sayi font-semibold text-slate-900 dark:text-slate-100">
                  {para(urun.adet * urun.birimFiyat)}
                </span>
              </div>
            ))}
          </Kart>

          {/* Müşteri */}
          <Kart className="px-4 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            <Satir etiket="Müşteri" deger={siparis.musteri.ad || '—'} />
            <Satir
              etiket="Telefon"
              deger={
                telefon ? (
                  <a href={`tel:+${telefon}`} className="text-marka-600 dark:text-marka-400">
                    {telefonGoster(siparis.musteri.telefon)}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Satir
              etiket="Adres"
              deger={<span className="whitespace-pre-line">{siparis.musteri.adres || '—'}</span>}
            />
            {siparis.musteri.not && <Satir etiket="Müşteri notu" deger={siparis.musteri.not} />}
          </Kart>

          {/* Kargo & ödeme */}
          <Kart className="px-4 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            <Satir etiket="Kargo tarihi" deger={tarih(tarihe(siparis.kargoTarihi))} />
            <Satir etiket="Kargo firması" deger={siparis.kargoFirmasi || '—'} />
            <Satir
              etiket="Takip no"
              deger={
                takipLinki ? (
                  <a
                    href={takipLinki}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-marka-600 underline-offset-4 hover:underline dark:text-marka-400"
                  >
                    {siparis.kargoTakipNo}
                  </a>
                ) : (
                  siparis.kargoTakipNo || '—'
                )
              }
            />
            <Satir etiket="Ödeme tarihi" deger={tarih(tarihe(siparis.odemeTarihi))} />
            <Satir etiket="Ödeme yöntemi" deger={siparis.odemeYontemi} />
          </Kart>

          {siparis.notlar && (
            <Kart className="px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sipariş notu</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">
                {siparis.notlar}
              </p>
            </Kart>
          )}

          {/* WhatsApp kısayolları */}
          <div className="grid gap-2 sm:grid-cols-2">
            {waOzet && (
              <a
                href={waOzet}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <WhatsappSimgesi className="size-5" />
                Sipariş özeti gönder
              </a>
            )}
            {waKargo && (
              <a
                href={waKargo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <WhatsappSimgesi className="size-5" />
                Kargo bilgisi gönder
              </a>
            )}
          </div>

          {/* Yönetim */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <Secim
              etiket="Durumu elle değiştir"
              value={siparis.durum}
              onChange={(e) => void durumDegistir(e.target.value as SiparisDurumu)}
              secenekler={SIPARIS_DURUMLARI.map((d) => ({ deger: d, etiket: d }))}
            />

            <div className="flex flex-wrap gap-2">
              <Buton
                tur="ikincil"
                boy="sm"
                onClick={() => {
                  void arsivDurumu(uid, siparis.id, !siparis.arsiv)
                  toast.bildir(siparis.arsiv ? 'Arşivden çıkarıldı.' : 'Arşive taşındı.')
                }}
              >
                {siparis.arsiv ? 'Arşivden çıkar' : 'Arşive taşı'}
              </Buton>
              {siparis.durum !== 'İptal' && (
                <Buton tur="ikincil" boy="sm" onClick={() => setIptalAcik(true)}>
                  Siparişi iptal et
                </Buton>
              )}
              <Buton tur="tehlike" boy="sm" onClick={() => setSilAcik(true)}>
                <CopSimgesi className="size-4" />
                Sil
              </Buton>
            </div>

            {(siparis.stokDusumleri?.length ?? 0) > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bu sipariş için {siparis.stokDusumleri?.reduce((t, d) => t + d.adet, 0)} şişe stoktan
                düşüldü. İptal edilirse stok geri yüklenir.
              </p>
            )}
          </div>
        </div>
      </Modal>

      <OnayKutusu
        acik={iptalAcik}
        kapat={() => setIptalAcik(false)}
        baslik="Siparişi iptal et"
        mesaj={`${siparis.siparisNo} iptal edilecek ve düşülen stok üretim partilerine geri yüklenecek.`}
        onayMetni="İptal et"
        tehlikeli
        onayla={async () => {
          await siparisIptal(uid, siparis.id)
          toast.basari('Sipariş iptal edildi, stok geri yüklendi.')
        }}
      />

      <OnayKutusu
        acik={silAcik}
        kapat={() => setSilAcik(false)}
        baslik="Siparişi sil"
        mesaj={`${siparis.siparisNo} kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        onayMetni="Kalıcı olarak sil"
        tehlikeli
        onayla={async () => {
          await siparisSil(uid, siparis.id)
          toast.basari('Sipariş silindi.')
          kapat()
        }}
      />
    </>
  )
}
