import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseYapilandirildi } from '../firebase'

interface AuthDegeri {
  kullanici: User | null
  yukleniyor: boolean
  girisYap: (eposta: string, sifre: string) => Promise<void>
  cikisYap: () => Promise<void>
  sifreSifirla: (eposta: string) => Promise<void>
}

const AuthContext = createContext<AuthDegeri | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [kullanici, setKullanici] = useState<User | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!firebaseYapilandirildi) {
      setYukleniyor(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setKullanici(u)
      setYukleniyor(false)
    })
  }, [])

  const deger = useMemo<AuthDegeri>(
    () => ({
      kullanici,
      yukleniyor,
      girisYap: async (eposta, sifre) => {
        await signInWithEmailAndPassword(auth, eposta.trim(), sifre)
      },
      cikisYap: async () => {
        await signOut(auth)
      },
      sifreSifirla: async (eposta) => {
        await sendPasswordResetEmail(auth, eposta.trim())
      },
    }),
    [kullanici, yukleniyor],
  )

  return <AuthContext value={deger}>{children}</AuthContext>
}

export function useAuth(): AuthDegeri {
  const deger = useContext(AuthContext)
  if (!deger) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir')
  return deger
}

/** Firebase hata kodlarını Türkçe mesaja çevirir. */
export function authHatasi(hata: unknown): string {
  const kod = (hata as { code?: string })?.code ?? ''
  switch (kod) {
    case 'auth/invalid-email':
      return 'E-posta adresi geçersiz.'
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.'
    case 'auth/network-request-failed':
      return 'İnternet bağlantısı kurulamadı.'
    default:
      return (hata as Error)?.message || 'Beklenmeyen bir hata oluştu.'
  }
}
