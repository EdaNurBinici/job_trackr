// Secretcv content script
// This script runs on Secretcv job pages

console.log('JobTrackr: Secretcv content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureJob') {
    try {
      const jobData = captureSecretcvJob();
      sendResponse({ success: true, data: jobData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep channel open for async response
});

function captureSecretcvJob() {
  // Secretcv'de şirket adı genelde gizli, URL'den çıkaralım
  const url = window.location.href;
  const urlParts = url.split('/').pop(); // Son kısmı al
  const jobSlug = urlParts?.split('-is-ilanlari-')[0]; // İş ilanı ID'sinden önceki kısmı al
  
  // URL'den şirket adını temizle ve düzenle
  let companyName = jobSlug
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Gizli Şirket';

  // Try multiple selectors for job title
  const position = 
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('.job-title')?.textContent?.trim() ||
    document.querySelector('h1.title')?.textContent?.trim() ||
    document.querySelector('[itemprop="title"]')?.textContent?.trim();

  // Try multiple selectors for location
  const location = 
    document.querySelector('.job-location')?.textContent?.trim() ||
    document.querySelector('[itemprop="jobLocation"]')?.textContent?.trim() ||
    document.querySelector('.location')?.textContent?.trim() ||
    '';

  if (!position) {
    throw new Error('İlan bilgileri bulunamadı. Sayfa tam yüklendi mi?');
  }

  // Temizle
  const cleanPosition = position.split('\n')[0].trim();
  const cleanLocation = location.split('\n')[0].trim();

  return {
    companyName: companyName,
    position: cleanPosition,
    location: cleanLocation,
    source: 'Secretcv',
    jobUrl: window.location.href
  };
}
