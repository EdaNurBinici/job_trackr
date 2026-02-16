# JobTrackr Extension - Kullanıcı Kurulum Rehberi

## Yöntem 1: Chrome Web Store'dan Kurulum (Önerilen)

### Adım 1: Extension'ı Bul
1. Chrome Web Store'u aç: https://chrome.google.com/webstore
2. Arama kutusuna "JobTrackr Assistant" yaz
3. JobTrackr Assistant extension'ını bul

### Adım 2: Yükle
1. "Add to Chrome" (Chrome'a Ekle) butonuna tıkla
2. Açılan pencerede "Add extension" (Uzantıyı ekle) tıkla
3. Extension otomatik yüklenecek!

### Adım 3: Kullan
1. JobTrackr web sitesinde giriş yap
2. Bir iş ilanı sitesine git (LinkedIn, Kariyer.net, Indeed, Secretcv)
3. Extension ikonuna tıkla (sağ üst köşede)
4. "İlanı Yakala" butonuna bas
5. "JobTrackr'a Kaydet" ile kaydet!

---

## Yöntem 2: Manuel Kurulum (Geliştirici Modu)

Bu yöntem Chrome Web Store'da yayınlanmadan önce veya geliştirme için kullanılır.

### Adım 1: Extension Dosyalarını İndir
1. GitHub'dan projeyi indir veya zip olarak al
2. `extension` klasörünü bul

### Adım 2: Chrome'da Geliştirici Modunu Aç
1. Chrome'u aç
2. Adres çubuğuna `chrome://extensions/` yaz ve Enter'a bas
3. Sağ üst köşede "Developer mode" (Geliştirici modu) düğmesini aç

### Adım 3: Extension'ı Yükle
1. "Load unpacked" (Paketlenmemiş uzantı yükle) butonuna tıkla
2. `extension` klasörünü seç
3. "Select Folder" (Klasörü seç) tıkla
4. Extension yüklendi!

### Adım 4: İlk Kurulum
1. Extension ikonuna tıkla
2. JobTrackr'da giriş yaptıysan otomatik bağlanacak
3. Giriş yapmadıysan, önce JobTrackr'da giriş yap

### Adım 5: Kullan
1. Bir iş ilanı sitesine git:
   - LinkedIn: https://www.linkedin.com/jobs/...
   - Kariyer.net: https://www.kariyer.net/is-ilani/...
   - Indeed: https://tr.indeed.com/viewjob...
   - Secretcv: https://www.secretcv.com/...

2. Extension ikonuna tıkla
3. "İlanı Yakala" butonuna bas
4. İlan bilgileri otomatik çekilecek
5. "JobTrackr'a Kaydet" ile kaydet!

---

## Sorun Giderme

### "Token bulunamadı" Hatası
**Çözüm**: JobTrackr'da giriş yaptığınızdan emin olun. Extension otomatik token alacaktır.

### "Bu sayfa desteklenmiyor" Hatası
**Çözüm**: Desteklenen bir iş ilanı sayfasında olduğunuzdan emin olun:
- LinkedIn iş ilanı sayfası
- Kariyer.net iş ilanı sayfası
- Indeed iş ilanı sayfası
- Secretcv iş ilanı sayfası

### "İlan bilgileri çekilemedi" Hatası
**Çözüm**: 
- Sayfanın tam yüklendiğinden emin olun
- Sayfayı yenileyin (F5)
- Birkaç saniye bekleyip tekrar deneyin

### Extension İkonu Görünmüyor
**Çözüm**:
1. `chrome://extensions/` sayfasını açın
2. JobTrackr Assistant'ın aktif olduğundan emin olun
3. Chrome'u yeniden başlatın

### Backend'e Bağlanamıyor
**Çözüm**:
- JobTrackr backend'inin çalıştığından emin olun
- API URL'inin doğru olduğundan emin olun

---

## Güncelleme

### Chrome Web Store'dan Yüklendiyse
Extension otomatik güncellenecektir. Hiçbir şey yapmanıza gerek yok!

### Manuel Yüklendiyse
1. Yeni extension dosyalarını indirin
2. `chrome://extensions/` sayfasını açın
3. JobTrackr Assistant'ın yanındaki yenile (🔄) butonuna tıklayın

---

## Kaldırma

Extension'ı kaldırmak için:
1. `chrome://extensions/` sayfasını açın
2. JobTrackr Assistant'ı bulun
3. "Remove" (Kaldır) butonuna tıklayın
4. Onaylayın

---

## Destek

Sorun mu yaşıyorsunuz?
- GitHub Issues: https://github.com/yourusername/jobtrackr/issues
- Email: support@jobtrackr.com
- Website: https://jobtrackr.com/support

---

## Gizlilik

JobTrackr Assistant:
- ✅ Sadece iş ilanı sayfalarında çalışır
- ✅ Token'ları güvenli şekilde saklar
- ✅ Verilerinizi sadece JobTrackr'a gönderir
- ✅ Üçüncü taraflarla veri paylaşmaz
- ✅ Açık kaynak kodludur

Daha fazla bilgi: https://jobtrackr.com/privacy
