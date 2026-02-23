const form = document.getElementById('settingsForm');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');
const apiUrlInput = document.getElementById('apiUrl');
const authTokenInput = document.getElementById('authToken');
chrome.storage.sync.get(['apiUrl', 'authToken'], (result) => {
  if (result.apiUrl) {
    apiUrlInput.value = result.apiUrl;
  }
  if (result.authToken) {
    authTokenInput.value = result.authToken;
  }
});
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const apiUrl = apiUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();
  if (!apiUrl || !authToken) {
    showStatus('❌ Lütfen tüm alanları doldurun', 'error');
    return;
  }
  try {
    await chrome.storage.sync.set({ apiUrl, authToken });
    showStatus('✅ Ayarlar başarıyla kaydedildi!', 'success');
  } catch (error) {
    showStatus('❌ Kaydetme hatası: ' + error.message, 'error');
  }
});
testBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();
  if (!apiUrl || !authToken) {
    showStatus('❌ Lütfen önce API URL ve Token girin', 'error');
    return;
  }
  testBtn.disabled = true;
  testBtn.textContent = '⏳ Test ediliyor...';
  try {
    const response = await fetch(`${apiUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    if (response.ok) {
      showStatus('✅ Bağlantı başarılı! API çalışıyor.', 'success');
    } else {
      showStatus('❌ API\'ye bağlanılamadı. Token geçerli mi?', 'error');
    }
  } catch (error) {
    showStatus('❌ Bağlantı hatası: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🔍 Bağlantıyı Test Et';
  }
});
