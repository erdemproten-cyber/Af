import { setDoc } from 'firebase/firestore'
import { ayarlarYolu } from './yollar'
import type { Ayarlar } from '../types'

export async function ayarlariKaydet(uid: string, ayarlar: Partial<Ayarlar>): Promise<void> {
  await setDoc(ayarlarYolu(uid), ayarlar, { merge: true })
}
