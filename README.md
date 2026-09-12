# Parfüm Takip

Tek kullanıcılı parfüm **sipariş** ve **envanter/demlenme** takip uygulaması.
React + Vite + TypeScript + Tailwind arayüzü, Firebase altyapısı. Mobil öncelikli,
PWA olarak telefona kurulabilir, çevrimdışı okuma yapar.

---

## İçindekiler

- [Ne yapar?](#ne-yapar)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Firebase kurulumu (adım adım)](#firebase-kurulumu-adım-adım)
- [Ortam değişkenleri (`.env`)](#ortam-değişkenleri-env)
- [Dağıtım (deploy)](#dağıtım-deploy)
- [Shopier webhook kurulumu](#shopier-webhook-kurulumu)
- [Katalog CSV içe aktarma](#katalog-csv-içe-aktarma)
- [Yedekleme](#yedekleme)
- [Testler](#testler)
- [Veri modeli](#veri-modeli)
- [Klasör yapısı](#klasör-yapısı)
- [Sık karşılaşılan sorunlar](#sık-karşılaşılan-sorunlar)

---

## Ne yapar?

**Sipariş takibi**
- WhatsApp / telefon / elden satışlar elle girilir, Shopier siparişleri webhook ile otomatik düşer.
- Akış: **Yeni → Hazırlanıyor → Kargolandı → Ödendi (arşiv)**. Her kartta tek dokunuşla ilerleyen düğmeler.
- Sipariş numarası otomatik artar (`SP-2026-0001`), yıl bazlı sayaçla ve işlem (transaction) içinde üretilir.
- Ödemesi 7 günden uzun süredir alınmamış siparişler panelde kırmızı uyarıyla listelenir.
- Müşteriye tek tuşla WhatsApp mesajı (sipariş özeti, kargo takip numarası, ödeme hatırlatması).
- Arşiv ayrı koleksiyon değildir — `arsiv: true` alanıyla filtrelenir, böylece geçmişte arama ve rapor kolaydır.

**Envanter & demlenme**
- Her dolum bir **üretim partisi** olarak kaydedilir: numara, adet, üretim tarihi, demlenme süresi, esanslar (opsiyonel), maliyet (opsiyonel).
- Demlenme yüzde barı: `(bugün − üretimTarihi) / demlenmeGün`. Renkler: 0–50 % kırmızı, 50–99 % turuncu, %100 yeşil “Hazır”.
- Sipariş oluşturulunca stok **FIFO** ile düşer: en eski **demlenmesi tamamlanmış** parti önce. Demlenen partilere dokunulmaz.
- Stok yetersizse sipariş **engellenmez**, yalnızca uyarı verilir.
- Sipariş iptal edilirse düşülen stok ilgili partilere geri yüklenir.

**Ekstralar**
- Panel: bugün/bu hafta/bu ay ciro, bekleyen tahsilat, aksiyon kutuları, düşük stok uyarısı.
- Üretim önerisi: son 90 günün satış hızına bakıp “şimdi üretmelisin” listesi çıkarır (30 günlük demlenme süresi hesaba katılır).
- Müşteri kartı: aynı telefonun geçmiş siparişleri, sık aldığı numaralar.
- Raporlar: aylık ciro grafiği, en çok satan 10 numara, maliyet girildiyse tahmini kâr.
- Her üretim partisi için yazdırılabilir **QR etiketi** — okutunca o partinin kartı açılır.
- Karanlık tema, büyük dokunma alanları (depoda telefonla kullanım için).
- Excel/CSV dışa aktarma (arşiv, katalog, raporlar) ve JSON yedek.

---

## Hızlı başlangıç

```bash
npm install
cp .env.example .env      # Firebase bilgilerinizi girin
npm run dev               # http://localhost:5173
```

Firebase hesabı olmadan denemek isterseniz emülatörlerle çalışabilirsiniz — bkz.
[Emülatörlerle geliştirme](#emülatörlerle-geliştirme).

**Gereksinimler:** Node.js 22+, npm 10+. Cloud Functions ve emülatörler için Java 11+ ve
Firebase CLI (`npm i -g firebase-tools`).

---

## Firebase kurulumu (adım adım)

### 1. Proje oluştur

1. [Firebase konsolu](https://console.firebase.google.com/) → **Proje ekle**.
2. Google Analytics'e ihtiyacınız yok, kapatabilirsiniz.

### 2. Web uygulaması ekle

1. Proje ana sayfasında **</>** (Web) simgesine tıklayın.
2. Takma ad verin (örn. `parfum-takip`), **Firebase Hosting'i de kur** kutusunu işaretleyin.
3. Ekranda çıkan `firebaseConfig` değerlerini `.env` dosyanıza kopyalayın (bkz. aşağıdaki bölüm).

### 3. Authentication — tek hesap

1. **Authentication → Başlayın → Oturum açma yöntemi → E-posta/Şifre** → etkinleştirin.
2. **Users → Kullanıcı ekle**: kendi e-postanız ve bir şifre.
3. Uygulamada **kayıt ekranı yoktur**; hesap yalnızca buradan açılır. Böylece uygulama tek kullanıcılı kalır.

> İsterseniz **Authentication → Settings → User actions** altından “Enable create (sign-up)”
> seçeneğini kapatarak yeni kayıt açılmasını tamamen engelleyebilirsiniz.

### 4. Firestore

1. **Firestore Database → Veritabanı oluştur**.
2. Konum olarak `eur3 (europe-west)` veya size yakın bir bölge seçin.
3. **Üretim modunda başlat** (test modunu seçmeyin).
4. Kuralları bu depodaki dosyadan dağıtın:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Proje kimliğini bağla

```bash
cp .firebaserc.example .firebaserc
# .firebaserc içindeki PROJE-KIMLIGINI-BURAYA-YAZ değerini kendi proje kimliğinizle değiştirin
```

veya:

```bash
firebase use --add
```

---

## Ortam değişkenleri (`.env`)

`.env.example` dosyasını `.env` olarak kopyalayıp Firebase konsolundaki
**Proje ayarları → Genel → Uygulamalarınız (Web)** değerleriyle doldurun:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=proje-kimligi.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=proje-kimligi
VITE_FIREBASE_STORAGE_BUCKET=proje-kimligi.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abcdef123456

# İsteğe bağlı: yerel emülatörlere bağlan
# VITE_USE_EMULATORS=true
```

> Bu değerler istemci tarafında görünür ve **gizli anahtar değildir**. Güvenlik
> `firestore.rules` ile sağlanır: yalnızca kimliği doğrulanmış ve `uid` eşleşen
> kullanıcı kendi verisini okuyup yazabilir.
>
> Cloud Function'ın gizli anahtarları ise `functions/.env` içindedir ve depoya
> **girmez** (`.gitignore`).

---

## Dağıtım (deploy)

```bash
npm run build            # dist/ klasörünü üretir
firebase deploy          # hosting + kurallar + functions
```

Parçalı dağıtım:

```bash
npm run deploy:hosting     # sadece arayüz
npm run deploy:rules       # sadece Firestore kuralları ve indeksler
npm run deploy:functions   # sadece Cloud Functions (Blaze planı gerekir)
```

İlk dağıtımdan sonra uygulama `https://PROJE-KIMLIGI.web.app` adresinde çalışır.
Telefonda tarayıcı menüsünden **“Ana ekrana ekle”** diyerek PWA olarak kurabilirsiniz.

### Emülatörlerle geliştirme

```bash
npm run emulators        # auth, firestore, functions, hosting
# başka bir terminalde:
VITE_USE_EMULATORS=true npm run dev
```

Emülatör kullanıcısı oluşturmak için Emulator UI'daki (http://127.0.0.1:4000)
Authentication sekmesini kullanın.

---

## Shopier webhook kurulumu

Shopier'in **Sipariş Bildirimi** (eski adıyla Otomatik Sipariş Bildirimi / OSB)
özelliği, her satışta belirlediğiniz adrese POST isteği gönderir. Bu depodaki
Cloud Function o isteği karşılar.

> Cloud Functions **Blaze (kullandıkça öde)** planı gerektirir. Bu ölçekte aylık
> maliyet genellikle sıfıra yakındır, ancak bir bütçe uyarısı tanımlamanız önerilir.

### 1. Ortam değişkenlerini hazırla

```bash
cd functions
cp .env.example .env
```

`functions/.env` içini doldurun:

| Değişken | Açıklama |
|---|---|
| `SAHIP_UID` | Firebase konsolu → Authentication → Users sütunundaki **User UID** |
| `SHOPIER_WEBHOOK_ANAHTARI` | Kendi belirlediğiniz uzun rastgele dize (aşağıda üretiliyor) |
| `SHOPIER_API_KEY` / `SHOPIER_API_SECRET` | Shopier geliştirici portalındaki anahtar çifti (imza doğrulaması için) |
| `URUN_KODU_ON_EKI` | Ürün kodu ön eki, varsayılan `AF` |

Rastgele anahtar üretmek için:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 2. Dağıt

```bash
npm --prefix functions install
npm run deploy:functions
```

Dağıtım sonunda şuna benzer bir adres yazdırılır:

```
https://europe-west1-PROJE-KIMLIGI.cloudfunctions.net/shopierWebhook
```

### 3. Shopier paneline tanımla

Shopier panelinde **Ek Özellikler → Sipariş Bildirimi** (ya da geliştirici portalı →
Webhook) bölümüne aşağıdaki adresi yazın — sonundaki `anahtar` parametresi zorunludur:

```
https://europe-west1-PROJE-KIMLIGI.cloudfunctions.net/shopierWebhook?anahtar=BURAYA_ANAHTAR
```

Anahtarı sorgu parametresi yerine `x-webhook-anahtari` başlığıyla da gönderebilirsiniz.

### 4. Nasıl çalışır?

1. İstek doğrulanır: paylaşılan anahtar + (tanımlıysa) Shopier HMAC-SHA256 imzası.
2. Ham gövde `users/{uid}/shopier_raw` altına loglanır — hata ayıklama için. Bu koleksiyona
   **yalnızca Cloud Function yazabilir**, istemci sadece okur.
3. Ürün kodundan (`AF-012`) parfüm numarası çözülür.
4. Sipariş `kaynak: "Shopier"`, `durum: "Yeni"`, `odemeYontemi: "Shopier"` olarak yazılır.
   Shopier ödemesi peşin alındığı için `odemeTarihi` doldurulur; sipariş yine de hazırlanıp
   kargolanacağı için arşive **inmez**.
5. Aynı `shopierSiparisId` ikinci kez gelirse yeni kayıt oluşturulmaz (**idempotent**).

Test etmek için:

```bash
curl -X POST "https://.../shopierWebhook?anahtar=ANAHTAR" \
  -H 'Content-Type: application/json' \
  -d '{"platform_order_id":"TEST-1","products":[{"productcode":"AF-012","quantity":1,"price":2500}]}'
```

(İmza doğrulaması açıksa `random_nr` ve `signature` alanları da gerekir; kapatmak için
`SHOPIER_API_SECRET` değerini boş bırakın.)

### Webhook çalışmazsa

**Ayarlar → Shopier → Shopier CSV içe aktar** ile panelden indirdiğiniz sipariş dökümünü
toplu yükleyebilirsiniz. Sütun adları esnek eşleştirilir; aynı sipariş numarası ikinci kez
yüklenirse yeni kayıt oluşturulmaz. Elle sipariş girişi her zaman açıktır.

---

## Katalog CSV içe aktarma

**Ayarlar → Katalog → CSV içe aktar**. Örnek şablon: [`ornek-katalog.csv`](ornek-katalog.csv)
(uygulamadaki “Örnek şablonu indir” düğmesiyle de alınabilir).

```csv
no;kod;cinsiyet;aciklama;varsayilanFiyat;aktif
1;AF-001;Kadın;Çiçeksi - yasemin, gül;2500;Evet
2;AF-002;Erkek;Odunsu - sedir, vetiver;2500;Evet
```

- Ayraç `;` veya `,` olabilir, otomatik algılanır (Türkçe Excel `;` kullanır).
- Yalnızca **`no`** zorunludur; diğer sütunlar boş bırakılabilir veya hiç olmayabilir.
- Başlık adları esnektir: `numara`, `fiyat`, `açıklama`, `ürün kodu` gibi yazımlar da tanınır.
- Aynı numara tekrar yüklenirse kayıt **güncellenir**, çift kayıt oluşmaz.
- Sayı biçimleri: `2.500,75` ve `2,500.75` ikisi de doğru okunur.

Katalogu sıfırdan kurmak için **“1–500 iskeleti oluştur”** düğmesiyle boş kayıtlar
oluşturup açıklama ve fiyatları sonradan doldurabilirsiniz.

---

## Yedekleme

**Elle:** Ayarlar → Yedekleme → **Yedek indir (JSON)**. Aynı ekrandaki
**Yedekten geri yükle** ile dosyayı geri yükleyebilirsiniz (tarih alanları korunur).

**Haftalık otomatik:** `functions/src/index.ts` içindeki `haftalikYedek` işlevi her pazar
03:00'te (Europe/Istanbul) tüm koleksiyonları Cloud Storage'a yazar:

```
gs://PROJE-KIMLIGI.firebasestorage.app/yedekler/parfum-takip-YYYY-AA-GG.json
```

Etkinleştirmek için `npm run deploy:functions` yeterlidir — Cloud Scheduler işi dağıtım
sırasında otomatik oluşturulur (Blaze planı gerekir). İstemiyorsanız o bloğu silip
yeniden dağıtın.

---

## Testler

```bash
npm test          # birim testleri (FIFO stok, demlenme, CSV, istatistik)
npm run test:rules # Firestore güvenlik kuralları (emülatör başlatır, Java gerekir)
npm run typecheck  # TypeScript denetimi
npm run lint       # oxlint
```

Birim testleri iş mantığının kritik kısımlarını kapsar: FIFO stok düşümü, demlenme
yüzdesi, CSV ayrıştırma, telefon/kod normalleştirme, müşteri özetleri ve üretim önerisi.
Kural testleri başka bir kullanıcının veya giriş yapmamış birinin veriye erişemediğini
doğrular.

---

## Veri modeli

Tüm veriler `users/{uid}/...` altında tutulur — güvenlik kuralları böylece basit kalır.

| Koleksiyon | İçerik |
|---|---|
| `users/{uid}/katalog/{no}` | Parfüm listesi (1–500). Belge kimliği numaradır, çift kayıt olamaz. |
| `users/{uid}/uretimler/{id}` | Üretim partileri: adet, kalan adet, üretim tarihi, demlenme, esanslar, maliyet. |
| `users/{uid}/siparisler/{id}` | Siparişler. Arşiv ayrı koleksiyon değil, `arsiv: true` alanı. |
| `users/{uid}/esanslar/{id}` | Esans sözlüğü — üretim formunda otomatik tamamlama. |
| `users/{uid}/meta/ayarlar` | Varsayılan demlenme/fiyat/hacim, kargo firmaları, tema. |
| `users/{uid}/meta/sayaclar` | Yıl bazlı sipariş numarası sayacı. |
| `users/{uid}/shopier_raw/{id}` | Webhook ham kayıtları. Yalnızca Cloud Function yazar. |

Alan ayrıntıları için [`src/types.ts`](src/types.ts) dosyasına bakın.

### Güvenlik kuralları hakkında

Firestore kuralları **birleşiktir (OR)**: eşleşen herhangi bir kural izin veriyorsa erişim
açılır. Bu yüzden `firestore.rules` içinde koleksiyonlar `{belge=**}` ile toplu değil,
tek tek eşleştirilir — aksi halde `shopier_raw` için konan yazma yasağı etkisiz kalırdı.

---

## Klasör yapısı

```
├── src/
│   ├── components/       # Arayüz bileşenleri
│   │   ├── ui/           # Buton, Girdi, Modal, Rozet, simgeler…
│   │   ├── siparis/      # Sipariş kartı, formu, detayı, kargo/ödeme modalları
│   │   └── envanter/     # Üretim formu, parti kartı, QR etiketi
│   ├── context/          # Auth, veri (canlı Firestore aboneliği), tema, bildirim
│   ├── lib/              # Saf yardımcılar: tarih, biçim, CSV, demlenme, istatistik
│   ├── pages/            # Panel, Siparişler, Envanter, Arşiv, Müşteriler, Raporlar, Ayarlar
│   ├── services/         # Firestore okuma/yazma: katalog, üretim, sipariş, stok, yedek
│   ├── firebase.ts       # SDK kurulumu, çevrimdışı kalıcılık
│   └── types.ts          # Veri modeli tipleri
├── functions/            # Cloud Functions (Shopier webhook + haftalık yedek)
├── tests/                # Birim testleri ve güvenlik kuralı testleri
├── firestore.rules       # Güvenlik kuralları
├── firestore.indexes.json
├── firebase.json
└── ornek-katalog.csv     # Katalog içe aktarma şablonu
```

---

## Sık karşılaşılan sorunlar

**“Firebase yapılandırması eksik” uyarısı görüyorum.**
`.env` dosyası yok veya eksik. `.env.example` dosyasını kopyalayıp doldurun ve
geliştirme sunucusunu yeniden başlatın (Vite `.env` değişikliklerini yeniden okumaz).

**Giriş yapamıyorum.**
Hesap Firebase konsolu → Authentication → Users altından açılır. Uygulamada kayıt ekranı
yoktur. Şifrenizi unuttuysanız giriş ekranındaki “Şifremi unuttum” bağlantısını kullanın.

**Siparişte “Stok yetersiz” uyarısı aldım ama stok var.**
Stok yalnızca **demlenmesi tamamlanmış** partilerden düşülür. Envanter ekranında partinin
“Hazır” rozeti yoksa satılabilir sayılmaz. Sipariş yine de kaydedilir.

**Sipariş listesi boş ama veri var.**
Ödemesi alınan siparişler otomatik olarak **Arşiv** sekmesine taşınır.

**“The query requires an index” hatası.**
`firebase deploy --only firestore:indexes` komutunu çalıştırın.

**Cloud Function dağıtılmıyor.**
Cloud Functions Blaze planı gerektirir. Firebase konsolu → Kullanım ve faturalandırma
bölümünden planı yükseltin.

**Webhook 401 dönüyor.**
`?anahtar=` parametresi `functions/.env` içindeki `SHOPIER_WEBHOOK_ANAHTARI` ile birebir
aynı olmalı. İmza hatasıysa `SHOPIER_API_SECRET` değerini kontrol edin veya imza
doğrulamasını kapatmak için boş bırakın. Her istek `shopier_raw` koleksiyonuna
loglanır — sorunu oradan izleyebilirsiniz.

**Çevrimdışıyken yaptığım değişiklikler kayboldu mu?**
Hayır. Firestore çevrimdışı kalıcılığı açıktır; bağlantı gelince değişiklikler gönderilir.
Üst çubukta “Çevrimdışısınız” uyarısı görünür.
