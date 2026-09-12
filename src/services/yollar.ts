import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase'

/** Tüm veriler users/{uid}/... altında tutulur — güvenlik kuralları böylece basit kalır. */
export const kullaniciYolu = (uid: string) => doc(db, 'users', uid)

export const katalogYolu = (uid: string) => collection(db, 'users', uid, 'katalog')
export const uretimYolu = (uid: string) => collection(db, 'users', uid, 'uretimler')
export const siparisYolu = (uid: string) => collection(db, 'users', uid, 'siparisler')
export const esansYolu = (uid: string) => collection(db, 'users', uid, 'esanslar')
export const shopierHamYolu = (uid: string) => collection(db, 'users', uid, 'shopier_raw')

export const ayarlarYolu = (uid: string) => doc(db, 'users', uid, 'meta', 'ayarlar')
export const sayaclarYolu = (uid: string) => doc(db, 'users', uid, 'meta', 'sayaclar')
