// Popup script
let capturedJob = null;

// DOM elements
const captureBtn = document.getElementById('captureBtn');
const saveBtn = document.getElementById('saveBtn');
const jobInfo = document.getElementById('jobInfo');
const statusDiv = document.getElementById('status');
const tokenSetup = document.getElementById('tokenSetup');
const actionsDiv = document.getElementById('actions');

// Try to get token from JobTrackr automatically
async function getTokenFromJobTrackr() {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Find JobTrackr tab
    const jobTrackrTab = tabs.find(tab => 
      tab.url && (
        tab.url.includes('localhost:5173') || 
        tab.url.includes('localhost:3000') ||
        tab.url.includes('jobtrackr-jfli.vercel.app') ||
        tab.url.includes('vercel.app')
      )
    );
    
    if (jobTrackrTab) {
      // Execute script to get token from localStorage
      const results = await chrome.scripting.executeScript({
        target: { tabId: jobTrackrTab.id },
        func: () => localStorage.getItem('token')
      });
      
      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    }
  } catch (e) {
    console.log('Could not get token from JobTrackr tab:', e);
  }
  return null;
}

// Check token on load
(async () => {
  // First try to get from JobTrackr tab
  const autoToken = await getTokenFromJobTrackr();
  
  if (autoToken) {
    // Save it and show actions
    await chrome.storage.sync.set({
      authToken: autoToken,
      apiUrl: 'https://jobtrackr-production-029f.up.railway.app'
    });
    tokenSetup.classList.add('hidden');
    actionsDiv.classList.remove('hidden');
    return;
  }
  
  // Check if we have saved token
  chrome.storage.sync.get(['authToken'], (result) => {
    if (!result.authToken) {
      // No token, show setup
      tokenSetup.classList.remove('hidden');
      actionsDiv.classList.add('hidden');
    } else {
      // Token exists, show actions
      tokenSetup.classList.add('hidden');
      actionsDiv.classList.remove('hidden');
    }
  });
})();

// Manual token save (fallback)
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const clearTokenLink = document.getElementById('clearTokenLink');

saveTokenBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  
  if (!token) {
    showStatus('❌ Lütfen token girin', 'error');
    return;
  }
  
  chrome.storage.sync.set({
    authToken: token,
    apiUrl: 'https://jobtrackr-production-029f.up.railway.app'
  }, () => {
    showStatus('✅ Token kaydedildi!', 'success');
    tokenSetup.classList.add('hidden');
    actionsDiv.classList.remove('hidden');
    tokenInput.value = '';
  });
});

// Clear token
clearTokenLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Token\'ı silmek istediğinizden emin misiniz?')) {
    chrome.storage.sync.remove(['authToken'], () => {
      showStatus('Token silindi', 'info');
      tokenSetup.classList.remove('hidden');
      actionsDiv.classList.add('hidden');
    });
  }
});

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
}

// Update job info display
function updateJobInfo(job) {
  document.getElementById('companyName').textContent = job.companyName || '-';
  document.getElementById('position').textContent = job.position || '-';
  document.getElementById('location').textContent = job.location || '-';
  document.getElementById('source').textContent = job.source || '-';
  
  jobInfo.classList.remove('hidden');
  saveBtn.classList.remove('hidden');
}

// Capture job from current page
captureBtn.addEventListener('click', async () => {
  try {
    captureBtn.disabled = true;
    captureBtn.textContent = '⏳ Yakalıyor...';
    showStatus('İlan bilgileri çekiliyor...', 'info');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a supported site
    const url = tab.url;
    const isLinkedIn = url.includes('linkedin.com/jobs');
    const isKariyer = url.includes('kariyer.net/is-ilani');
    const isIndeed = url.includes('indeed.com/viewjob') || url.includes('indeed.com/jobs');
    const isSecretcv = url.includes('secretcv.com/') && url.split('/').length >= 5;
    
    if (!isLinkedIn && !isKariyer && !isIndeed && !isSecretcv) {
      throw new Error('Bu sayfa desteklenmiyor. Lütfen LinkedIn, Kariyer.net, Indeed veya Secretcv iş ilanı sayfasında olduğunuzdan emin olun.');
    }

    // Execute content script to capture data
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        
        if (url.includes('linkedin.com/jobs')) {
          // LinkedIn - basit ve direkt selector'lar
          const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name');
          const positionEl = document.querySelector('.job-details-jobs-unified-top-card__job-title');
          const locationEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description');
          
          return {
            companyName: companyEl?.textContent?.trim() || null,
            position: positionEl?.textContent?.trim() || null,
            location: locationEl?.textContent?.trim() || '',
            source: 'LinkedIn'
          };
        } else if (url.includes('kariyer.net')) {
          // Kariyer.net
          const companyEl = document.querySelector('.company-name') || document.querySelector('[data-test="company-name"]');
          const positionEl = document.querySelector('.job-title') || document.querySelector('h1');
          const locationEl = document.querySelector('.location') || document.querySelector('[data-test="location"]');
          
          return {
            companyName: companyEl?.textContent?.trim() || null,
            position: positionEl?.textContent?.trim() || null,
            location: locationEl?.textContent?.trim() || '',
            source: 'Kariyer.net'
          };
        } else if (url.includes('indeed.com')) {
          // Indeed
          const companyEl = document.querySelector('[data-company-name="true"]') || 
                           document.querySelector('.jobsearch-InlineCompanyRating-companyHeader a') ||
                           document.querySelector('.icl-u-lg-mr--sm');
          const positionEl = document.querySelector('.jobsearch-JobInfoHeader-title') || 
                            document.querySelector('h1');
          const locationEl = document.querySelector('[data-testid="inlineHeader-companyLocation"]') ||
                            document.querySelector('.jobsearch-JobInfoHeader-subtitle div');
          
          return {
            companyName: companyEl?.textContent?.trim() || null,
            position: positionEl?.textContent?.trim() || null,
            location: locationEl?.textContent?.trim() || '',
            source: 'Indeed'
          };
        } else if (url.includes('secretcv.com')) {
          // Secretcv - URL'den şirket adını çıkar
          // URL format: https://www.secretcv.com/dr-hakan-hamzacebi-mobil-uygulama-gelistirici
          const pathParts = url.split('/').filter(p => p);
          const lastPart = pathParts[pathParts.length - 1];
          
          // Son kısmı al ve temizle
          let companyName = 'Gizli Şirket';
          if (lastPart) {
            // İlk kelimeyi şirket adı olarak al
            const words = lastPart.split('-');
            if (words.length > 0) {
              companyName = words.slice(0, Math.min(3, words.length))
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
          
          const positionEl = document.querySelector('h1') || 
                            document.querySelector('.job-title');
          const locationEl = document.querySelector('.job-location') ||
                            document.querySelector('[itemprop="jobLocation"]');
          
          return {
            companyName: companyName,
            position: positionEl?.textContent?.trim() || null,
            location: locationEl?.textContent?.trim() || '',
            source: 'Secretcv'
          };
        }
        
        return null;
      }
    });

    const job = results[0].result;
    
    if (!job || !job.companyName || !job.position) {
      throw new Error('İlan bilgileri çekilemedi. Sayfa tam yüklendi mi?');
    }

    capturedJob = {
      ...job,
      jobUrl: tab.url
    };

    updateJobInfo(capturedJob);
    showStatus('✅ İlan başarıyla yakalandı!', 'success');
    
  } catch (error) {
    console.error('Capture error:', error);
    showStatus('❌ ' + error.message, 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = '🎯 İlanı Yakala';
  }
});

// Save to JobTrackr
saveBtn.addEventListener('click', async () => {
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Kaydediliyor...';
    showStatus('JobTrackr\'a kaydediliyor...', 'info');

    // Try to get fresh token from JobTrackr
    let authToken = await getTokenFromJobTrackr();
    
    // If not found, use saved token
    if (!authToken) {
      const settings = await chrome.storage.sync.get(['authToken']);
      authToken = settings.authToken;
    } else {
      // Save the fresh token
      await chrome.storage.sync.set({ authToken });
    }
    
    if (!authToken) {
      throw new Error('Token bulunamadı! Lütfen JobTrackr\'da giriş yapın.');
    }

    const apiUrl = 'https://jobtrackr-production-029f.up.railway.app';

    // Send to API
    const response = await fetch(`${apiUrl}/api/applications/quick-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        companyName: capturedJob.companyName,
        position: capturedJob.position,
        location: capturedJob.location,
        jobUrl: capturedJob.jobUrl,
        source: capturedJob.source
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error Response:', error);
      throw new Error(error.error?.message || 'Kaydetme başarısız');
    }

    showStatus('✅ JobTrackr\'a başarıyla kaydedildi!', 'success');
    
    // Reset after 2 seconds
    setTimeout(() => {
      capturedJob = null;
      jobInfo.classList.add('hidden');
      saveBtn.classList.add('hidden');
    }, 2000);
    
  } catch (error) {
    console.error('Save error:', error);
    showStatus('❌ ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 JobTrackr\'a Kaydet';
  }
});
