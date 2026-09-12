/** Kargo firmasına göre takip bağlantısı üretir. */

const SABLONLAR: Array<{ anahtar: RegExp; baglanti: (takipNo: string) => string }> = [
  {
    anahtar: /yurt\s*i[çc]i/i,
    baglanti: (n) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${n}`,
  },
  {
    anahtar: /aras/i,
    baglanti: (n) => `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${n}`,
  },
  { anahtar: /mng/i, baglanti: (n) => `https://kargotakip.mngkargo.com.tr/?takipno=${n}` },
  { anahtar: /ptt/i, baglanti: (n) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${n}` },
  { anahtar: /s[üu]rat/i, baglanti: (n) => `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${n}` },
  { anahtar: /hepsi\s*jet/i, baglanti: (n) => `https://www.hepsijet.com/gonderi-takibi?trackingCode=${n}` },
  { anahtar: /trendyol/i, baglanti: (n) => `https://www.trendyolexpress.com/gonderi-sorgula?code=${n}` },
  { anahtar: /ups/i, baglanti: (n) => `https://www.ups.com/track?loc=tr_TR&tracknum=${n}` },
  { anahtar: /sendeo/i, baglanti: (n) => `https://sendeo.com.tr/gonderi-takip?code=${n}` },
]

export function kargoTakipLinki(firma: string, takipNo: string): string | null {
  const no = (takipNo || '').trim()
  if (!no) return null
  const eslesme = SABLONLAR.find((s) => s.anahtar.test(firma || ''))
  return eslesme ? eslesme.baglanti(encodeURIComponent(no)) : null
}
