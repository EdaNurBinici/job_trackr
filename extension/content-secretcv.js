console.log('JobTrackr: Secretcv content script loaded');
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
  const url = window.location.href;
  const urlParts = url.split('/').pop(); // Son kısmı al
  const jobSlug = urlParts?.split('-is-ilanlari-')[0]; // İş ilanı ID'sinden önceki kısmı al
  let companyName = jobSlug
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Gizli Şirket';
  const position = 
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('.job-title')?.textContent?.trim() ||
    document.querySelector('h1.title')?.textContent?.trim() ||
    document.querySelector('[itemprop="title"]')?.textContent?.trim();
  const location = 
    document.querySelector('.job-location')?.textContent?.trim() ||
    document.querySelector('[itemprop="jobLocation"]')?.textContent?.trim() ||
    document.querySelector('.location')?.textContent?.trim() ||
    '';
  if (!position) {
    throw new Error('İlan bilgileri bulunamadı. Sayfa tam yüklendi mi?');
  }
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
