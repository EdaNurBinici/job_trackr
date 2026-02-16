// Kariyer.net content script
// This script runs on Kariyer.net job pages

console.log('JobTrackr: Kariyer.net content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureJob') {
    try {
      const jobData = captureKariyerJob();
      sendResponse({ success: true, data: jobData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep channel open for async response
});

function captureKariyerJob() {
  // Try multiple selectors for company name
  const companyName = 
    document.querySelector('.company-name')?.textContent?.trim() ||
    document.querySelector('[data-test="company-name"]')?.textContent?.trim() ||
    document.querySelector('.job-company')?.textContent?.trim() ||
    '';

  // Try multiple selectors for job title
  const position = 
    document.querySelector('.job-title')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('.position-title')?.textContent?.trim();

  // Try multiple selectors for location
  const location = 
    document.querySelector('.location')?.textContent?.trim() ||
    document.querySelector('[data-test="location"]')?.textContent?.trim() ||
    document.querySelector('.job-location')?.textContent?.trim() ||
    '';

  if (!companyName || !position) {
    throw new Error('İlan bilgileri bulunamadı. Sayfa tam yüklendi mi?');
  }

  return {
    companyName,
    position,
    location,
    source: 'Kariyer.net',
    jobUrl: window.location.href
  };
}
