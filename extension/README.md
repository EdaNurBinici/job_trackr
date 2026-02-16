# JobTrackr Chrome Extension 🚀

LinkedIn, Kariyer.net, Indeed ve Secretcv'den tek tıkla iş ilanlarını JobTrackr'a ekleyin!

## Özellikler ✨

- 🎯 LinkedIn iş ilanlarını otomatik yakala
- 🎯 Kariyer.net iş ilanlarını otomatik yakala
- 💾 Tek tıkla JobTrackr'a kaydet
- ⚡ Hızlı ve kolay kullanım
- 🔒 Güvenli token-based authentication

## Kurulum 📦

### 1. Extension'ı Yükle

1. Bu `extension/` klasörünü bilgisayarınıza indirin
2. Chrome tarayıcınızı açın
3. Adres çubuğuna `chrome://extensions/` yazın
4. Sağ üstten "Developer mode" (Geliştirici modu) açın
5. "Load unpacked" (Paketlenmemiş uzantı yükle) butonuna tıklayın
6. `extension/` klasörünü seçin
7. Extension yüklendi! 🎉

### 2. Ayarları Yapılandır

1. Extension ikonuna tıklayın
2. "⚙️ Ayarlar" linkine tıklayın
3. Aşağıdaki bilgileri girin:

**API URL:**
```
http://localhost:3001
```

**Auth Token:**
Token'ı almak için:
1. JobTrackr'a giriş yapın (http://localhost:5173)
2. F12 ile Developer Tools'u açın
3. Console'a gidin
4. Şunu yazın: `localStorage.getItem('token')`
5. Çıkan token'ı kopyalayın (tırnak işaretleri olmadan)
6. Ayarlar sayfasına yapıştırın

4. "💾 Kaydet" butonuna tıklayın
5. "🔍 Bağlantıyı Test Et" ile test edin

## Kullanım 📖

### LinkedIn'den İlan Ekleme

1. LinkedIn'de bir iş ilanına gidin
   - Örnek: https://www.linkedin.com/jobs/view/123456789
2. Extension ikonuna tıklayın
3. "🎯 İlanı Yakala" butonuna tıklayın
4. İlan bilgileri otomatik çekilecek
5. "💾 JobTrackr'a Kaydet" butonuna tıklayın
6. Başarılı! ✅

### Kariyer.net'ten İlan Ekleme

1. Kariyer.net'te bir iş ilanına gidin
   - Örnek: https://www.kariyer.net/is-ilani/...
2. Extension ikonuna tıklayın
3. "🎯 İlanı Yakala" butonuna tıklayın
4. İlan bilgileri otomatik çekilecek
5. "💾 JobTrackr'a Kaydet" butonuna tıklayın
6. Başarılı! ✅

## Desteklenen Siteler 🌐

- ✅ LinkedIn Jobs (linkedin.com/jobs/*)
- ✅ Kariyer.net (kariyer.net/is-ilani/*)
- ✅ Indeed (tr.indeed.com/viewjob*, tr.indeed.com/jobs*)
- ✅ Secretcv (secretcv.com/ilan/*)

## Sorun Giderme 🔧

### "Bu sayfa desteklenmiyor" Hatası
- LinkedIn veya Kariyer.net iş ilanı sayfasında olduğunuzdan emin olun
- Sayfa tam yüklenene kadar bekleyin

### "İlan bilgileri çekilemedi" Hatası
- Sayfayı yenileyin (F5)
- Birkaç saniye bekleyip tekrar deneyin
- LinkedIn'de farklı bir ilan sayfası deneyin

### "API'ye bağlanılamadı" Hatası
- Ayarlardan API URL'in doğru olduğundan emin olun
- Backend'in çalıştığından emin olun (http://localhost:3001/health)
- Token'ın geçerli olduğundan emin olun

### "Token geçersiz" Hatası
- JobTrackr'dan çıkış yapıp tekrar giriş yapın
- Yeni token'ı alıp ayarlara girin

## Teknik Detaylar 🛠️

- **Manifest Version:** 3
- **Permissions:** activeTab, storage
- **Content Scripts:** LinkedIn ve Kariyer.net için
- **API:** REST API (JWT authentication)

## Güvenlik 🔒

- Token'lar Chrome'un güvenli storage'ında saklanır
- HTTPS üzerinden iletişim (production'da)
- Token'lar asla loglanmaz

## Geliştirici Notları 💻

Extension pure vanilla JavaScript ile yazılmıştır, build gerektirmez.

**Dosya Yapısı:**
```
extension/
├── manifest.json       # Extension config
├── popup.html          # Popup UI
├── popup.css           # Popup styles
├── popup.js            # Popup logic
├── settings.html       # Settings page
├── settings.js         # Settings logic
├── icons/              # Extension icons
└── README.md           # Bu dosya
```

**Test:**
```bash
# Backend'i başlat
npm run dev

# Frontend'i başlat
cd client && npm run dev

# Extension'ı Chrome'a yükle
# chrome://extensions/ → Load unpacked → extension/
```

## Sürüm Geçmişi 📝

### v1.0.0 (2026-02-12)
- ✨ İlk sürüm
- ✅ LinkedIn desteği
- ✅ Kariyer.net desteği
- ✅ Quick-add API endpoint
- ✅ Settings sayfası

## Lisans 📄

MIT License

## Destek 💬

Sorun mu yaşıyorsunuz? GitHub'da issue açın!

---

Made with ❤️ for JobTrackr
