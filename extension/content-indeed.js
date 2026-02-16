// Indeed content script
// This script runs on Indeed job pages

console.log('JobTrackr: Indeed content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureJob') {
    try {
      const jobData = captureIndeedJob();
      sendResponse({ success: true, data: jobData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep channel open for async response
});

function captureIndeedJob() {
  // Try multiple selectors for company name
  const companyName = 
    document.querySelector('[data-company-name="true"]')?.textContent?.trim() ||
    document.querySelector('.jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() ||
    document.querySelector('.jobsearch-CompanyInfoContainer a')?.textContent?.trim() ||
    document.querySelector('.icl-u-lg-mr--sm')?.textContent?.trim();

  // Try multiple selectors for job title
  const position = 
    document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
    document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim();

  // Try multiple selectors for location
  const location = 
    document.querySelector('[data-testid="inlineHeader-companyLocation"]')?.textContent?.trim() ||
    document.querySelector('.jobsearch-JobInfoHeader-subtitle div')?.textContent?.trim() ||
    '';

  if (!companyName || !position) {
    throw new Error('İlan bilgileri bulunamadı. Sayfa tam yüklendi mi?');
  }

  // Temizle
  const cleanCompanyName = companyName.split('\n')[0].trim();
  const cleanPosition = position.split('\n')[0].trim();
  const cleanLocation = location.split('\n')[0].trim();

  return {
    companyName: cleanCompanyName,
    position: cleanPosition,
    location: cleanLocation,
    source: 'Indeed',
    jobUrl: window.location.href
  };
}
