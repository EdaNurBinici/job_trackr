let capturedJob = null;
const captureBtn = document.getElementById('captureBtn');
const saveBtn = document.getElementById('saveBtn');
const jobInfo = document.getElementById('jobInfo');
const statusDiv = document.getElementById('status');
const tokenSetup = document.getElementById('tokenSetup');
const actionsDiv = document.getElementById('actions');

async function getTokenFromJobTrackr() {
  try {
    const tabs = await chrome.tabs.query({});
    const jobTrackrTab = tabs.find(tab => 
      tab.url && (
        tab.url.includes('localhost:5173') || 
        tab.url.includes('localhost:3000') ||
        tab.url.includes('vercel.app')
      )
    );
    if (jobTrackrTab) {
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

(async () => {
  const autoToken = await getTokenFromJobTrackr();
  if (autoToken) {
    await chrome.storage.sync.set({
      authToken: autoToken,
      apiUrl: 'https://jobtrackr-backend-fsn2.onrender.com'
    });
    tokenSetup.classList.add('hidden');
    actionsDiv.classList.remove('hidden');
    return;
  }
  chrome.storage.sync.get(['authToken'], (result) => {
    if (!result.authToken) {
      tokenSetup.classList.remove('hidden');
      actionsDiv.classList.add('hidden');
    } else {
      tokenSetup.classList.add('hidden');
      actionsDiv.classList.remove('hidden');
    }
  });
})();

const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const clearTokenLink = document.getElementById('clearTokenLink');

saveTokenBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    showStatus('Lutfen token girin', 'error');
    return;
  }
  chrome.storage.sync.set({
    authToken: token,
    apiUrl: 'https://jobtrackr-backend-fsn2.onrender.com'
  }, () => {
    showStatus('Token kaydedildi!', 'success');
    tokenSetup.classList.add('hidden');
    actionsDiv.classList.remove('hidden');
    tokenInput.value = '';
  });
});

clearTokenLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Tokeni silmek istediginizden emin misiniz?')) {
    chrome.storage.sync.remove(['authToken'], () => {
      showStatus('Token silindi', 'info');
      tokenSetup.classList.remove('hidden');
      actionsDiv.classList.add('hidden');
    });
  }
});

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

function updateJobInfo(job) {
  document.getElementById('companyName').textContent = job.companyName || '-';
  document.getElementById('position').textContent = job.position || '-';
  document.getElementById('location').textContent = job.location || '-';
  document.getElementById('source').textContent = job.source || '-';
  jobInfo.classList.remove('hidden');
  saveBtn.classList.remove('hidden');
}

captureBtn.addEventListener('click', async () => {
  try {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Yakaliyor...';
    showStatus('Ilan bilgileri cekiliyor...', 'info');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    const isLinkedIn = url.includes('linkedin.com/jobs');
    const isKariyer = url.includes('kariyer.net/is-ilani');
    const isIndeed = url.includes('indeed.com/viewjob') || url.includes('indeed.com/jobs');
    const isSecretcv = url.includes('secretcv.com/') && url.split('/').length >= 5;

    if (!isLinkedIn && !isKariyer && !isIndeed && !isSecretcv) {
      throw new Error('Bu sayfa desteklenmiyor. LinkedIn, Kariyer.net, Indeed veya Secretcv is ilani sayfasinda olun.');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = window.location.href;
        if (url.includes('linkedin.com/jobs')) {
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
          const companyEl = document.querySelector('[data-company-name="true"]') || 
                           document.querySelector('.jobsearch-InlineCompanyRating-companyHeader a');
          const positionEl = document.querySelector('.jobsearch-JobInfoHeader-title') || 
                            document.querySelector('h1');
          const locationEl = document.querySelector('[data-testid="inlineHeader-companyLocation"]');
          return {
            companyName: companyEl?.textContent?.trim() || null,
            position: positionEl?.textContent?.trim() || null,
            location: locationEl?.textContent?.trim() || '',
            source: 'Indeed'
          };
        } else if (url.includes('secretcv.com')) {
          const pathParts = url.split('/').filter(p => p);
          const lastPart = pathParts[pathParts.length - 1];
          let companyName = 'Gizli Sirket';
          if (lastPart) {
            const words = lastPart.split('-');
            companyName = words.slice(0, Math.min(3, words.length))
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          const positionEl = document.querySelector('h1') || document.querySelector('.job-title');
          const locationEl = document.querySelector('.job-location');
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
      throw new Error('Ilan bilgileri cekilemedi. Sayfa tam yuklendi mi?');
    }

    capturedJob = { ...job, jobUrl: tab.url };
    updateJobInfo(capturedJob);
    showStatus('Ilan basariyla yakalandi!', 'success');
  } catch (error) {
    console.error('Capture error:', error);
    showStatus('Hata: ' + error.message, 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = '🎯 Ilani Yakala';
  }
});

saveBtn.addEventListener('click', async () => {
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Kaydediliyor...';
    showStatus("JobTrackr'a kaydediliyor...", 'info');

    let authToken = await getTokenFromJobTrackr();
    if (!authToken) {
      const settings = await chrome.storage.sync.get(['authToken']);
      authToken = settings.authToken;
    } else {
      await chrome.storage.sync.set({ authToken });
    }

    if (!authToken) {
      throw new Error("Token bulunamadi! Lutfen JobTrackr'da giris yapin.");
    }

    const apiUrl = 'https://jobtrackr-backend-fsn2.onrender.com';
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
      throw new Error(error.error?.message || 'Kaydetme basarisiz');
    }

    showStatus("JobTrackr'a basariyla kaydedildi!", 'success');
    setTimeout(() => {
      capturedJob = null;
      jobInfo.classList.add('hidden');
      saveBtn.classList.add('hidden');
    }, 2000);
  } catch (error) {
    console.error('Save error:', error);
    showStatus('Hata: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 JobTrackra Kaydet';
  }
});
