import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddJobByLink() {
  const [showModal, setShowModal] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    setError('');

    if (!jobUrl.trim()) {
      setError('Lütfen bir link girin');
      return;
    }

    // Check if it's a supported job site
    const supportedSites = [
      'linkedin.com',
      'kariyer.net',
      'indeed.com',
      'secretcv.com'
    ];

    const isSupportedSite = supportedSites.some(site => jobUrl.includes(site));

    if (!isSupportedSite) {
      setError('Bu site desteklenmiyor. Sadece LinkedIn, Kariyer.net, Indeed ve Secretcv desteklenir.');
      return;
    }

    // Navigate to application form with the URL
    navigate('/applications/new', {
      state: {
        jobUrl: jobUrl.trim(),
        fromLink: true
      }
    });
  };

  return (
    <>
      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all duration-200 hover:scale-110"
        aria-label="İlan Linki Ekle"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlan Linki Ekle
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setJobUrl('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              LinkedIn, Kariyer.net, Indeed veya Secretcv'den iş ilanı linkini yapıştırın
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <textarea
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              rows={4}
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setJobUrl('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
