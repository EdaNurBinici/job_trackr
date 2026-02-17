# Chrome Web Store'a Extension Yükleme Rehberi

## Ön Hazırlık

### 1. İkonlar Hazırla
Extension için 3 boyutta ikon gerekli:
- `icon16.png` - 16x16 px (toolbar)
- `icon48.png` - 48x48 px (extension yönetimi)
- `icon128.png` - 128x128 px (Chrome Web Store)

İkonları `extension/icons/` klasörüne koy.

### 2. Manifest'i Güncelle
`manifest.json` dosyasına ikon yollarını ekle:

```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

### 3. Production URL'lerini Ekle
`extension/popup.js` dosyasında localhost yerine production URL'ini kullan:

```javascript
// Değiştir:
const apiUrl = 'http://localhost:3000';

// Şununla:
const apiUrl = 'https://api.jobtrackr.com'; // Senin production API URL'in
```

### 4. Extension'ı Zipla
Extension klasörünü ziple (manifest.json root'ta olmalı):
```bash
cd extension
zip -r jobtrackr-extension.zip .
```

## Chrome Web Store'a Yükleme

### Adım 1: Developer Hesabı Oluştur
1. https://chrome.google.com/webstore/devconsole adresine git
2. Google hesabınla giriş yap
3. **$5 tek seferlik kayıt ücreti** öde (kredi kartı gerekli)

### Adım 2: Extension'ı Yükle
1. "New Item" butonuna tıkla
2. `jobtrackr-extension.zip` dosyasını yükle
3. Formu doldur:

#### Store Listing (Mağaza Sayfası)
- **Name**: JobTrackr Assistant
- **Summary**: İş ilanlarını tek tıkla JobTrackr'a ekleyin
- **Description**:
```
JobTrackr Assistant ile iş başvuru sürecinizi kolaylaştırın!

✨ ÖZELLİKLER:
• LinkedIn, Kariyer.net, Indeed ve Secretcv'den tek tıkla iş ilanı yakalama
• Otomatik şirket, pozisyon ve lokasyon çıkarma
• JobTrackr hesabınıza anında kaydetme
• Kullanımı kolay, hızlı ve güvenli

🎯 NASIL KULLANILIR:
1. JobTrackr'da giriş yapın
2. Bir iş ilanı sayfasına gidin
3. Extension ikonuna tıklayın
4. "İlanı Yakala" butonuna basın
5. "JobTrackr'a Kaydet" ile kaydedin!

🔒 GÜVENLİK:
• Token'lar güvenli şekilde saklanır
• Verileriniz sadece sizin kontrolünüzde
• Açık kaynak kodlu

📱 DESTEK:
• GitHub: github.com/yourusername/jobtrackr
• Email: support@jobtrackr.com
```

- **Category**: Productivity
- **Language**: Turkish

#### Screenshots (Ekran Görüntüleri)
En az 1, en fazla 5 ekran görüntüsü yükle:
- Extension popup'ı
- İlan yakalama
- Başarılı kaydetme
- JobTrackr dashboard

Boyut: 1280x800 veya 640x400

#### Promotional Images (Tanıtım Görselleri)
- **Small tile**: 440x280 px
- **Large tile**: 920x680 px (opsiyonel)
- **Marquee**: 1400x560 px (opsiyonel)

### Adım 3: Privacy & Distribution (Gizlilik ve Dağıtım)

#### Privacy
- **Single Purpose**: "Job application tracking and management"
- **Permission Justification**: 
  - `activeTab`: İş ilanı sayfasından bilgi çıkarmak için
  - `storage`: Token ve ayarları saklamak için
  - `scripting`: Sayfa içeriğini okumak için

#### Distribution
- **Visibility**: Public (veya Unlisted)
- **Regions**: Turkey (veya tüm ülkeler)

### Adım 4: Submit for Review
1. "Submit for Review" butonuna tıkla
2. İnceleme süreci 1-3 gün sürer
3. Onaylanınca Chrome Web Store'da yayınlanır!

## Güncelleme Yayınlama

Extension'ı güncellemek için:
1. `manifest.json`'da version'ı artır (örn: 1.0.0 → 1.0.1)
2. Yeni zip oluştur
3. Developer Console'da "Upload Updated Package" tıkla
4. Yeni zip'i yükle
5. Submit for review

## Önemli Notlar

### Reddedilme Sebepleri
- Eksik veya yanıltıcı açıklamalar
- Gereksiz izinler
- Gizlilik politikası eksikliği
- Kötü kaliteli ekran görüntüleri

### İpuçları
- Açıklamaları detaylı yaz
- Kaliteli ekran görüntüleri kullan
- Sadece gerekli izinleri iste
- Gizlilik politikası sayfası ekle (website'de)

### Maliyetler
- Developer kayıt: $5 (tek seferlik)
- Extension yayınlama: Ücretsiz
- Güncelleme: Ücretsiz

## Alternatif: Unpacked Extension (Geliştirme)

Chrome Web Store'a yüklemeden kullanmak için:
1. `chrome://extensions/` aç
2. "Developer mode" aktif et
3. "Load unpacked" tıkla
4. `extension` klasörünü seç

Bu yöntem sadece geliştirme için, kullanıcılar için değil!

## Yardım

Sorular için:
- Chrome Web Store Docs: https://developer.chrome.com/docs/webstore/
- Support: https://support.google.com/chrome_webstore/
