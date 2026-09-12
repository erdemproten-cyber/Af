import assert from 'node:assert/strict'
import { describe, test } from 'vitest'
import { Timestamp } from 'firebase/firestore'

import { dusumPlaniHesapla, siparisDusumPlani } from '../src/services/stok'
import { demlenmeDurumu, stokOzeti } from '../src/lib/demlenme'
import { csvCoz, csvNesneler, csvYaz, sayiyaCevir } from '../src/lib/csv'
import { aramaMetni, koddanNo, telefonNormalize, telefonGoster, urunKodu } from '../src/lib/format'
import { gunFarki, haftaBasi } from '../src/lib/date'
import { kargoTakipLinki } from '../src/lib/kargo'
import { odemeBeklemeGunu, siparisAra } from '../src/lib/siparisDurum'
import { musteriOzetleri, uretimOnerileri } from '../src/lib/istatistik'
import type { Siparis, Uretim } from '../src/types'

const GUN = 86_400_000
const SIMDI = new Date('2026-09-12T12:00:00Z')

function parti(kısım: Partial<Uretim> & { id: string; gunOnce: number; kalanAdet: number }): Uretim {
  const uretim = new Date(SIMDI.getTime() - kısım.gunOnce * GUN)
  const demlenmeGun = kısım.demlenmeGun ?? 30
  return {
    id: kısım.id,
    parfumNo: kısım.parfumNo ?? 12,
    hacimMl: 100,
    adet: kısım.adet ?? kısım.kalanAdet,
    kalanAdet: kısım.kalanAdet,
    uretimTarihi: Timestamp.fromDate(uretim),
    demlenmeGun,
    demlenmeBitis: Timestamp.fromMillis(uretim.getTime() + demlenmeGun * GUN),
    esanslar: [],
    notlar: '',
    maliyet: 0,
  }
}

describe('demlenme', () => {
  test('40 gün önceki parti hazırdır, yüzde 100', () => {
    const durum = demlenmeDurumu(parti({ id: 'a', gunOnce: 40, kalanAdet: 6 }), SIMDI)
    assert.equal(durum.hazir, true)
    assert.equal(durum.yuzde, 100)
    assert.equal(durum.kalanGun, 0)
  })

  test('15 gün önceki parti %50, 15 gün kaldı', () => {
    const durum = demlenmeDurumu(parti({ id: 'b', gunOnce: 15, kalanAdet: 6 }), SIMDI)
    assert.equal(durum.hazir, false)
    assert.equal(durum.yuzde, 50)
    assert.equal(durum.kalanGun, 15)
  })

  test('bugün üretilen parti %0', () => {
    assert.equal(demlenmeDurumu(parti({ id: 'c', gunOnce: 0, kalanAdet: 6 }), SIMDI).yuzde, 0)
  })

  test('demlenme süresi 0 ise anında hazır', () => {
    const durum = demlenmeDurumu(parti({ id: 'd', gunOnce: 0, kalanAdet: 6, demlenmeGun: 0 }), SIMDI)
    assert.equal(durum.hazir, true)
  })

  test('stok özeti hazır ve demlenen adetleri ayırır', () => {
    const ozet = stokOzeti(
      [
        parti({ id: 'a', gunOnce: 40, kalanAdet: 6 }),
        parti({ id: 'b', gunOnce: 5, kalanAdet: 4 }),
        parti({ id: 'c', gunOnce: 1, kalanAdet: 3, parfumNo: 20 }),
      ],
      SIMDI,
    )
    assert.equal(ozet.get(12)!.hazirAdet, 6)
    assert.equal(ozet.get(12)!.demlenenAdet, 4)
    assert.equal(ozet.get(12)!.enYakinHazirGun, 25)
    assert.equal(ozet.get(20)!.hazirAdet, 0)
  })
})

describe('FIFO stok düşümü', () => {
  test('en eski hazır partiden düşer', () => {
    const plan = dusumPlaniHesapla(
      [
        parti({ id: 'yeni', gunOnce: 35, kalanAdet: 5 }),
        parti({ id: 'eski', gunOnce: 60, kalanAdet: 5 }),
      ],
      3,
      SIMDI,
    )
    assert.deepEqual(plan.dusumler, [{ uretimId: 'eski', parfumNo: 12, adet: 3 }])
    assert.equal(plan.eksik, 0)
  })

  test('birden fazla partiye yayılır', () => {
    const plan = dusumPlaniHesapla(
      [
        parti({ id: 'eski', gunOnce: 60, kalanAdet: 2 }),
        parti({ id: 'yeni', gunOnce: 35, kalanAdet: 5 }),
      ],
      4,
      SIMDI,
    )
    assert.deepEqual(plan.dusumler, [
      { uretimId: 'eski', parfumNo: 12, adet: 2 },
      { uretimId: 'yeni', parfumNo: 12, adet: 2 },
    ])
    assert.equal(plan.eksik, 0)
  })

  test('demlenmesi bitmemiş partiye DOKUNMAZ, eksik bildirir', () => {
    const plan = dusumPlaniHesapla(
      [
        parti({ id: 'hazir', gunOnce: 40, kalanAdet: 1 }),
        parti({ id: 'demleniyor', gunOnce: 3, kalanAdet: 10 }),
      ],
      4,
      SIMDI,
    )
    assert.deepEqual(plan.dusumler, [{ uretimId: 'hazir', parfumNo: 12, adet: 1 }])
    assert.equal(plan.eksik, 3)
  })

  test('hiç hazır stok yoksa tamamı eksik kalır', () => {
    const plan = dusumPlaniHesapla([parti({ id: 'x', gunOnce: 2, kalanAdet: 10 })], 2, SIMDI)
    assert.deepEqual(plan.dusumler, [])
    assert.equal(plan.eksik, 2)
  })

  test('aynı numara iki kalemde geçerse stok iki kez düşülmez', () => {
    const partiler = new Map([[12, [parti({ id: 'tek', gunOnce: 40, kalanAdet: 3 })]]])
    const sonuc = siparisDusumPlani(
      [
        { parfumNo: 12, kod: 'AF-012', adet: 2, birimFiyat: 2500 },
        { parfumNo: 12, kod: 'AF-012', adet: 2, birimFiyat: 2500 },
      ],
      partiler,
      SIMDI,
    )
    assert.deepEqual(sonuc.dusumler, [{ uretimId: 'tek', parfumNo: 12, adet: 3 }])
    assert.equal(sonuc.eksikler.get(12), 1)
  })

  test('farklı numaralar bağımsız düşer', () => {
    const partiler = new Map([
      [12, [parti({ id: 'a', gunOnce: 40, kalanAdet: 5 })]],
      [20, [parti({ id: 'b', gunOnce: 40, kalanAdet: 5, parfumNo: 20 })]],
    ])
    const sonuc = siparisDusumPlani(
      [
        { parfumNo: 12, kod: 'AF-012', adet: 2, birimFiyat: 2500 },
        { parfumNo: 20, kod: 'AF-020', adet: 1, birimFiyat: 2500 },
      ],
      partiler,
      SIMDI,
    )
    assert.equal(sonuc.dusumler.length, 2)
    assert.equal(sonuc.eksikler.size, 0)
  })
})

describe('CSV', () => {
  test('noktalı virgül ayracını algılar', () => {
    assert.deepEqual(csvCoz('a;b;c\n1;2;3'), [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  test('tırnak içindeki ayraç ve satır sonu korunur', () => {
    const [, satir] = csvCoz('no,aciklama\n12,"yasemin, gül"')
    assert.deepEqual(satir, ['12', 'yasemin, gül'])
  })

  test('çift tırnak kaçışı çözülür', () => {
    const [, satir] = csvCoz('a,b\n1,"de ""bu"" var"')
    assert.equal(satir[1], 'de "bu" var')
  })

  test('BOM temizlenir ve başlıklar okunur', () => {
    const { satirlar } = csvNesneler('﻿no;kod\n12;AF-012')
    assert.equal(satirlar[0].no, '12')
    assert.equal(satirlar[0].kod, 'AF-012')
  })

  test('yazılan CSV geri okunabilir', () => {
    const metin = csvYaz(['a', 'b'], [['x;y', 'z"q']])
    const { satirlar } = csvNesneler(metin)
    assert.equal(satirlar[0].a, 'x;y')
    assert.equal(satirlar[0].b, 'z"q')
  })

  test('Türkçe ve İngilizce sayı biçimleri', () => {
    assert.equal(sayiyaCevir('2.500,75'), 2500.75)
    assert.equal(sayiyaCevir('2,500.75'), 2500.75)
    assert.equal(sayiyaCevir('₺2500'), 2500)
    assert.equal(sayiyaCevir(''), 0)
    assert.equal(sayiyaCevir('abc'), 0)
  })
})

describe('biçimlendirme', () => {
  test('ürün kodu ve numara çözümü', () => {
    assert.equal(urunKodu(12), 'AF-012')
    assert.equal(koddanNo('AF-012'), 12)
    assert.equal(koddanNo('af12'), 12)
    assert.equal(koddanNo('500'), 500)
    assert.equal(koddanNo('abc'), null)
  })

  test('telefon normalleştirme', () => {
    assert.equal(telefonNormalize('0532 111 22 33'), '905321112233')
    assert.equal(telefonNormalize('+90 532 111 22 33'), '905321112233')
    assert.equal(telefonNormalize('5321112233'), '905321112233')
    assert.equal(telefonGoster('905321112233'), '0532 111 22 33')
  })

  test('kargo takip bağlantısı', () => {
    assert.match(kargoTakipLinki('Yurtiçi Kargo', '123')!, /yurticikargo\.com/)
    assert.equal(kargoTakipLinki('Bilinmeyen Kargo', '123'), null)
    assert.equal(kargoTakipLinki('Aras Kargo', ''), null)
  })
})

describe('tarih', () => {
  test('hafta pazartesi başlar', () => {
    // 12.09.2026 cumartesi → hafta başı 07.09.2026 pazartesi
    assert.equal(haftaBasi(new Date(2026, 8, 12)).getDate(), 7)
  })

  test('gün farkı takvim günü bazlı', () => {
    assert.equal(gunFarki(new Date(2026, 8, 1), new Date(2026, 8, 11)), 10)
  })
})

describe('istatistik', () => {
  function siparis(kısım: Partial<Siparis> & { id: string }): Siparis {
    return {
      id: kısım.id,
      siparisNo: kısım.siparisNo ?? 'SP-2026-0001',
      kaynak: 'WhatsApp',
      shopierSiparisId: '',
      musteri: kısım.musteri ?? { ad: 'Ayşe', telefon: '05321112233', adres: '', not: '' },
      urunler: kısım.urunler ?? [{ parfumNo: 12, kod: 'AF-012', adet: 1, birimFiyat: 2500 }],
      toplamTutar: kısım.toplamTutar ?? 2500,
      durum: kısım.durum ?? 'Yeni',
      siparisTarihi: Timestamp.fromDate(
        kısım.siparisTarihi ? kısım.siparisTarihi.toDate() : new Date(SIMDI.getTime() - 10 * GUN),
      ),
      kargoTarihi: null,
      kargoFirmasi: '',
      kargoTakipNo: '',
      odemeTarihi: null,
      odemeYontemi: 'Havale/EFT',
      arsiv: false,
      notlar: '',
      stokDusumleri: [],
    }
  }

  test('aynı telefon tek müşteri kartında toplanır', () => {
    const ozetler = musteriOzetleri([
      siparis({ id: '1' }),
      siparis({ id: '2', musteri: { ad: 'Ayşe Y.', telefon: '0532 111 22 33', adres: '', not: '' } }),
    ])
    assert.equal(ozetler.length, 1)
    assert.equal(ozetler[0].siparisAdedi, 2)
    assert.equal(ozetler[0].toplamTutar, 5000)
    assert.deepEqual(ozetler[0].favoriNumaralar, [12])
  })

  test('iptal edilen sipariş müşteri özetine girmez', () => {
    assert.equal(musteriOzetleri([siparis({ id: '1', durum: 'İptal' })]).length, 0)
  })

  test('hızlı satan ve stoğu biten numara için üretim önerilir', () => {
    const siparisler = Array.from({ length: 30 }, (_, i) =>
      siparis({
        id: `s${i}`,
        siparisTarihi: Timestamp.fromDate(new Date(SIMDI.getTime() - i * 2 * GUN)),
      }),
    )
    const stok = stokOzeti([parti({ id: 'az', gunOnce: 40, kalanAdet: 1 })], SIMDI)
    const oneriler = uretimOnerileri(siparisler, stok, 30, 90, SIMDI)
    assert.equal(oneriler.length, 1)
    assert.equal(oneriler[0].parfumNo, 12)
    assert.ok(oneriler[0].onerilenAdet > 0)
  })

  test('stoğu bol numara için üretim önerilmez', () => {
    const siparisler = [siparis({ id: 's1' })]
    const stok = stokOzeti([parti({ id: 'bol', gunOnce: 40, kalanAdet: 500 })], SIMDI)
    assert.equal(uretimOnerileri(siparisler, stok, 30, 90, SIMDI).length, 0)
  })
})

describe('arama normalleştirme', () => {
  test('Türkçe büyük/küçük harf farkı aramayı bozmaz', () => {
    assert.equal(aramaMetni('ISIM'), 'isim')
    assert.equal(aramaMetni('İsim'), 'isim')
    assert.equal(aramaMetni('isim'), 'isim')
    assert.equal(aramaMetni('  Iso E Super '), 'iso e super')
  })

  test('null ve sayı girdileri güvenli', () => {
    assert.equal(aramaMetni(null), '')
    assert.equal(aramaMetni(12), '12')
  })
})

describe('sipariş durumu', () => {
  const temel = {
    id: 'x',
    siparisNo: 'SP-2026-0001',
    kaynak: 'WhatsApp' as const,
    shopierSiparisId: '',
    musteri: { ad: '', telefon: '', adres: '', not: '' },
    urunler: [],
    toplamTutar: 0,
    kargoFirmasi: '',
    kargoTakipNo: '',
    odemeYontemi: 'Havale/EFT' as const,
    notlar: '',
    stokDusumleri: [],
  }

  test('kargo tarihinden itibaren sayar', () => {
    const s = {
      ...temel,
      durum: 'Kargolandı' as const,
      siparisTarihi: Timestamp.fromDate(new Date(SIMDI.getTime() - 30 * GUN)),
      kargoTarihi: Timestamp.fromDate(new Date(SIMDI.getTime() - 9 * GUN)),
      odemeTarihi: null,
      arsiv: false,
    }
    assert.equal(odemeBeklemeGunu(s, SIMDI), 9)
  })

  test('kargolanmadıysa sipariş tarihinden sayar', () => {
    const s = {
      ...temel,
      durum: 'Yeni' as const,
      siparisTarihi: Timestamp.fromDate(new Date(SIMDI.getTime() - 4 * GUN)),
      kargoTarihi: null,
      odemeTarihi: null,
      arsiv: false,
    }
    assert.equal(odemeBeklemeGunu(s, SIMDI), 4)
  })

  test('ödenmiş, arşivli veya iptal siparişler sayılmaz', () => {
    const taban = {
      ...temel,
      durum: 'Kargolandı' as const,
      siparisTarihi: Timestamp.fromDate(new Date(SIMDI.getTime() - 20 * GUN)),
      kargoTarihi: null,
      odemeTarihi: null,
      arsiv: false,
    }
    assert.equal(odemeBeklemeGunu({ ...taban, odemeTarihi: Timestamp.fromDate(SIMDI) }, SIMDI), null)
    assert.equal(odemeBeklemeGunu({ ...taban, arsiv: true }, SIMDI), null)
    assert.equal(odemeBeklemeGunu({ ...taban, durum: 'İptal' }, SIMDI), null)
  })
})

describe('sipariş arama', () => {
  const s = (k: Partial<Siparis> & { id: string }): Siparis => ({
    id: k.id,
    siparisNo: k.siparisNo ?? 'SP-2026-0042',
    kaynak: 'WhatsApp',
    shopierSiparisId: '',
    musteri: k.musteri ?? { ad: 'Ayşe Yılmaz', telefon: '0532 111 22 33', adres: 'Kadıköy', not: '' },
    urunler: k.urunler ?? [{ parfumNo: 12, kod: 'AF-012', adet: 1, birimFiyat: 2500 }],
    toplamTutar: 2500,
    durum: 'Yeni',
    siparisTarihi: Timestamp.fromDate(SIMDI),
    kargoTarihi: null,
    kargoFirmasi: '',
    kargoTakipNo: '',
    odemeTarihi: null,
    odemeYontemi: 'Havale/EFT',
    arsiv: false,
    notlar: k.notlar ?? '',
    stokDusumleri: [],
  })

  const liste = [s({ id: '1' }), s({ id: '2', musteri: { ad: 'Mehmet Demir', telefon: '05559998877', adres: '', not: '' }, urunler: [{ parfumNo: 7, kod: 'AF-007', adet: 1, birimFiyat: 2500 }] })]

  test('boş sorgu hepsini döndürür', () => {
    assert.equal(siparisAra(liste, '').length, 2)
  })

  test('müşteri adıyla bulur (Türkçe küçük/büyük harf duyarsız)', () => {
    assert.equal(siparisAra(liste, 'AYŞE')[0].id, '1')
    assert.equal(siparisAra(liste, 'mehmet')[0].id, '2')
  })

  test('sipariş numarasıyla bulur', () => {
    assert.equal(siparisAra(liste, 'sp-2026-0042').length, 2)
  })

  test('telefonun son hanelerinden bulur', () => {
    assert.equal(siparisAra(liste, '9998877')[0].id, '2')
  })

  test('kısa rakam dizisi telefonla eşleşmez', () => {
    assert.equal(siparisAra(liste, '12')[0].id, '1')
  })

  test('parfüm numarası ve koduyla bulur', () => {
    assert.equal(siparisAra(liste, '7')[0].id, '2')
    assert.equal(siparisAra(liste, 'af-007')[0].id, '2')
  })

  test('eşleşme yoksa boş döner', () => {
    assert.equal(siparisAra(liste, 'bulunamaz').length, 0)
  })
})
