import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ShareTarget = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleShare = async () => {
      // Check if user is logged in
      if (!user) {
        // Redirect to login with return URL
        const url = searchParams.get('url') || '';
        const title = searchParams.get('title') || '';
        localStorage.setItem('pendingShare', JSON.stringify({ url, title }));
        navigate('/login');
        return;
      }

      const sharedUrl = searchParams.get('url');
      const sharedTitle = searchParams.get('title');
      const sharedText = searchParams.get('text');

      if (!sharedUrl) {
        setError('İlan linki bulunamadı');
        setLoading(false);
        return;
      }

      // Check if it's a supported job site
      const supportedSites = [
        'linkedin.com',
        'kariyer.net',
        'indeed.com',
        'secretcv.com'
      ];

      const isSupportedSite = supportedSites.some(site => sharedUrl.includes(site));

      if (!isSupportedSite) {
        setError('Bu site desteklenmiyor. Sadece LinkedIn, Kariyer.net, Indeed ve Secretcv desteklenir.');
        setLoading(false);
        return;
      }

      // Navigate to application form with pre-filled data
      navigate('/applications/new', {
        state: {
          jobUrl: sharedUrl,
          jobTitle: sharedTitle || sharedText || '',
          fromShare: true
        }
      });
    };

    handleShare();
  }, [searchParams, navigate, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">İlan yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hata</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary px-6 py-2"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
