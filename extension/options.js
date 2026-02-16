// Options page script
const form = document.getElementById('settingsForm');
const statusDiv = document.getElementById('status');
const apiUrlInput = document.getElementById('apiUrl');
const authTokenInput = document.getElementById('authToken');

// Load saved settings
chrome.storage.sync.get(['apiUrl', 'authToken'], (result) => {
  if (result.apiUrl) {
    apiUrlInput.value = result.apiUrl;
  }
  if (result.authToken) {
    authTokenInput.value = result.authToken;
  }
});

// Save settings
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const apiUrl = apiUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();
  
  if (!apiUrl || !authToken) {
    showStatus('Lütfen tüm alanları doldurun', 'error');
    return;
  }
  
  chrome.storage.sync.set({
    apiUrl: apiUrl,
    authToken: authToken
  }, () => {
    showStatus('✅ Ayarlar başarıyla kaydedildi!', 'success');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  });
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}
