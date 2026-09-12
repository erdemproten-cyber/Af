import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const ayar: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** .env dosyası doldurulmadıysa arayüzde anlaşılır bir uyarı gösterebilmek için. */
export const firebaseYapilandirildi = Boolean(ayar.apiKey && ayar.projectId)

/**
 * Yapılandırma eksikse SDK yer tutucu değerlerle başlatılır.
 * Aksi halde `getAuth` modül yüklenirken `auth/invalid-api-key` fırlatır ve
 * kullanıcı bomboş bir sayfa görür; bu şekilde giriş ekranındaki
 * "Firebase yapılandırması eksik" uyarısı görünebilir.
 */
const YER_TUTUCU: FirebaseOptions = {
  apiKey: 'yapilandirilmamis',
  authDomain: 'yapilandirilmamis.firebaseapp.com',
  projectId: 'yapilandirilmamis',
  appId: '1:0:web:yapilandirilmamis',
}

export const app = initializeApp(firebaseYapilandirildi ? ayar : YER_TUTUCU)

export const auth = getAuth(app)

// Çevrimdışı kalıcılık: birden fazla sekme açıkken de çalışır.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

// Oturum tarayıcıda kalsın (telefonda her açılışta giriş istemesin).
void setPersistence(auth, browserLocalPersistence).catch(() => {
  /* özel sekmede başarısız olabilir; yok sayılır */
})
