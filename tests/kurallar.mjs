/**
 * Firestore güvenlik kuralları testi.
 *
 * Çalıştırmak için:  npm run test:rules
 * (Firebase emülatörünü kendisi başlatır; Java kurulu olmalıdır.)
 */
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'

const ortam = await initializeTestEnvironment({
  projectId: 'demo-kural-testi',
  firestore: {
    host: '127.0.0.1',
    port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080),
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
})

let gecen = 0
let kalan = 0
async function test(ad, calistir) {
  try {
    await calistir()
    gecen++
    console.log('✓', ad)
  } catch (e) {
    kalan++
    console.log('✗', ad, '→', e.message)
  }
}

const sahip = ortam.authenticatedContext('sahip-uid').firestore()
const yabanci = ortam.authenticatedContext('yabanci-uid').firestore()
const misafir = ortam.unauthenticatedContext().firestore()

const yol = (db, p) => doc(db, p)

await test('sahip kendi kataloğunu yazabilir', () =>
  assertSucceeds(setDoc(yol(sahip, 'users/sahip-uid/katalog/012'), { no: 12, kod: 'AF-012' })))

await test('sahip kendi kataloğunu okuyabilir', () =>
  assertSucceeds(getDoc(yol(sahip, 'users/sahip-uid/katalog/012'))))

await test('sahip üretim yazabilir', () =>
  assertSucceeds(setDoc(yol(sahip, 'users/sahip-uid/uretimler/p1'), { parfumNo: 12, adet: 6 })))

await test('sahip sipariş yazabilir', () =>
  assertSucceeds(setDoc(yol(sahip, 'users/sahip-uid/siparisler/s1'), { siparisNo: 'SP-2026-0001' })))

await test('sahip ayar yazabilir', () =>
  assertSucceeds(setDoc(yol(sahip, 'users/sahip-uid/meta/ayarlar'), { varsayilanFiyat: 2500 })))

await test('sahip esans yazabilir', () =>
  assertSucceeds(setDoc(yol(sahip, 'users/sahip-uid/esanslar/iso-e-super'), { ad: 'Iso E Super' })))

await test('BAŞKA kullanıcı sahibin kataloğunu OKUYAMAZ', () =>
  assertFails(getDoc(yol(yabanci, 'users/sahip-uid/katalog/012'))))

await test('BAŞKA kullanıcı sahibin siparişine YAZAMAZ', () =>
  assertFails(setDoc(yol(yabanci, 'users/sahip-uid/siparisler/s2'), { siparisNo: 'sahte' })))

await test('BAŞKA kullanıcı sahibin üretimini SİLEMEZ', () =>
  assertFails(deleteDoc(yol(yabanci, 'users/sahip-uid/uretimler/p1'))))

await test('GİRİŞSİZ kullanıcı OKUYAMAZ', () =>
  assertFails(getDoc(yol(misafir, 'users/sahip-uid/katalog/012'))))

await test('GİRİŞSİZ kullanıcı YAZAMAZ', () =>
  assertFails(setDoc(yol(misafir, 'users/sahip-uid/katalog/013'), { no: 13 })))

await test('GİRİŞSİZ kullanıcı koleksiyonu listeleyemez', () =>
  assertFails(getDocs(collection(misafir, 'users/sahip-uid/siparisler'))))

// Admin SDK ile yazılmış ham webhook kaydı
await ortam.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users/sahip-uid/shopier_raw/h1'), { govde: {} })
})

await test('sahip shopier_raw OKUYABİLİR', () =>
  assertSucceeds(getDoc(yol(sahip, 'users/sahip-uid/shopier_raw/h1'))))

await test('sahip shopier_raw YAZAMAZ (sadece Cloud Function yazar)', () =>
  assertFails(setDoc(yol(sahip, 'users/sahip-uid/shopier_raw/h2'), { govde: {} })))

await test('sahip shopier_raw SİLEMEZ', () =>
  assertFails(deleteDoc(yol(sahip, 'users/sahip-uid/shopier_raw/h1'))))

await test('users dışındaki koleksiyonlar kapalı', () =>
  assertFails(setDoc(yol(sahip, 'rastgele/belge'), { a: 1 })))

await ortam.cleanup()
console.log(`\n${gecen} geçti, ${kalan} kaldı`)
process.exit(kalan > 0 ? 1 : 0)
