import { useState, type FormEvent } from 'react'
import { authHatasi, useAuth } from '../context/AuthContext'
import { firebaseYapilandirildi } from '../firebase'
import { Buton, Girdi, Kart } from '../components/ui'
import { SiseSimgesi } from '../components/ui/simgeler'

export default function Giris() {
  const { girisYap, sifreSifirla } = useAuth()
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  async function gonder(olay: FormEvent) {
    olay.preventDefault()
    setHata(null)
    setBilgi(null)
    setGonderiliyor(true)
    try {
      await girisYap(eposta, sifre)
    } catch (e) {
      setHata(authHatasi(e))
    } finally {
      setGonderiliyor(false)
    }
  }

  async function sifremiUnuttum() {
    if (!eposta.trim()) {
      setHata('Önce e-posta adresinizi yazın.')
      return
    }
    setHata(null)
    try {
      await sifreSifirla(eposta)
      setBilgi('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
    } catch (e) {
      setHata(authHatasi(e))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-marka-500 text-slate-950">
            <SiseSimgesi className="size-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Parfüm Takip</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş ve envanter yönetimi</p>
          </div>
        </div>

        {!firebaseYapilandirildi && (
          <Kart className="mb-4 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">Firebase yapılandırması eksik</p>
            <p className="mt-1">
              <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">.env.example</code> dosyasını{' '}
              <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">.env</code> olarak kopyalayıp
              Firebase proje bilgilerinizi girin, sonra sunucuyu yeniden başlatın.
            </p>
          </Kart>
        )}

        <Kart className="p-5">
          <form onSubmit={gonder} className="flex flex-col gap-4">
            <Girdi
              etiket="E-posta"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              placeholder="ornek@eposta.com"
            />
            <Girdi
              etiket="Şifre"
              type="password"
              autoComplete="current-password"
              required
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="••••••••"
            />

            {hata && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {hata}
              </p>
            )}
            {bilgi && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {bilgi}
              </p>
            )}

            <Buton type="submit" boy="lg" tamGenislik yukleniyor={gonderiliyor} disabled={!firebaseYapilandirildi}>
              Giriş yap
            </Buton>

            <button
              type="button"
              onClick={sifremiUnuttum}
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline dark:text-slate-400"
            >
              Şifremi unuttum
            </button>
          </form>
        </Kart>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
          Bu uygulama tek kullanıcılıdır; kayıt ekranı yoktur. Hesap Firebase konsolundan açılır.
        </p>
      </div>
    </div>
  )
}
