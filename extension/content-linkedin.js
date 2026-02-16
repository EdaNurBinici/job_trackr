// LinkedIn content script
// This script runs on LinkedIn job pages

console.log('JobTrackr: LinkedIn content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureJob') {
    try {
      const jobData = captureLinkedInJob();
      sendResponse({ success: true, data: jobData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep channel open for async response
});

function captureLinkedInJob() {
  // Try multiple selectors for company name - 2026 güncel versiyonu
  const companyName = 
    document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.textContent?.trim() ||
    document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__company-name')?.textContent?.trim() ||
    document.querySelector('[data-test-id="job-details-company-name"]')?.textContent?.trim() ||
    document.querySelector('.topcard__org-name-link')?.textContent?.trim() ||
    document.querySelector('.topcard__flavor')?.textContent?.trim() ||
    document.querySelector('a[data-tracking-control-name="public_jobs_topcard-org-name"]')?.textContent?.trim() ||
    document.querySelector('.job-details-jobs-unified-top-card__primary-description a')?.textContent?.trim();

  // Try multiple selectors for job title
  const position = 
    document.querySelector('.job-details-jobs-unified-top-card__job-title h1')?.textContent?.trim() ||
    document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__job-title h1')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__job-title')?.textContent?.trim() ||
    document.querySelector('[data-test-id="job-details-job-title"]')?.textContent?.trim() ||
    document.querySelector('.topcard__title')?.textContent?.trim() ||
    document.querySelector('h1.t-24')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__job-title a')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim();

  // Try multiple selectors for location
  const location = 
    document.querySelector('.job-details-jobs-unified-top-card__primary-description')?.textContent?.trim() ||
    document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__bullet')?.textContent?.trim() ||
    document.querySelector('[data-test-id="job-details-location"]')?.textContent?.trim() ||
    document.querySelector('.topcard__flavor--bullet')?.textContent?.trim() ||
    document.querySelector('.jobs-unified-top-card__workplace-type')?.textContent?.trim() ||
    '';

  if (!companyName || !position) {
    throw new Error('İlan bilgileri bulunamadı. Sayfa tam yüklendi mi?');
  }

  // Temizle
  const cleanCompanyName = companyName.split('·')[0].split('\n')[0].trim();
  const cleanPosition = position.split('\n')[0].trim();
  const cleanLocation = location.split('·')[0].split('\n')[0].trim();

  return {
    companyName: cleanCompanyName,
    position: cleanPosition,
    location: cleanLocation,
    source: 'LinkedIn',
    jobUrl: window.location.href
  };
}
