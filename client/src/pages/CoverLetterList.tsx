import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface CoverLetter {
  id: string;
  companyName: string;
  position: string;
  tone: string;
  language: string;
  createdAt: string;
}

export default function CoverLetterList() {
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCoverLetters();
  }, []);

  const loadCoverLetters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cover-letter/user/list');
      setCoverLetters(response.data.data);
    } catch (err: any) {
      setError('Ön yazılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const response = await api.get(`/cover-letter/${id}`);
      setSelectedLetter(response.data.data);
      setShowModal(true);
    } catch (err: any) {
      setError('Ön yazı yüklenemedi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ön yazıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/cover-letter/${id}`);
      setCoverLetters(coverLetters.filter(cl => cl.id !== id));
    } catch (err: any) {
      setError('Silme başarısız oldu');
    }
  };

  const handleCopy = () => {
    if (selectedLetter) {
      navigator.clipboard.writeText(selectedLetter.content);
      alert('📋 Panoya kopyalandı!');
    }
  };

  const handleDownload = () => {
    if (selectedLetter) {
      const blob = new Blob([selectedLetter.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${selectedLetter.companyName.replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getToneEmoji = (tone: string) => {
    switch (tone) {
      case 'formal': return '🎩';
      case 'casual': return '😊';
      case 'creative': return '🎨';
      default: return '📝';
    }
  };

  const getLanguageFlag = (lang: string) => {
    return lang === 'tr' ? '🇹🇷' : '🇬🇧';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📚 Ön Yazılarım</h1>
        <button
          onClick={() => navigate('/cover-letter-generator')}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 justify-center"
        >
          <span>➕</span>
          <span>Yeni Ön Yazı Oluştur</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg border border-red-300 dark:border-red-800 flex items-start space-x-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {coverLetters.length === 0 ? (
        <div className="card p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📝</span>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Henüz ön yazı oluşturmadınız.
          </p>
          <button
            onClick={() => navigate('/cover-letter-generator')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            İlk Ön Yazınızı Oluşturun
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {coverLetters.map((cl) => (
            <div
              key={cl.id}
              className="card p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {cl.companyName} - {cl.position}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{getToneEmoji(cl.tone)} {cl.tone}</span>
                  <span>{getLanguageFlag(cl.language)} {cl.language.toUpperCase()}</span>
                  <span>📅 {new Date(cl.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(cl.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <span>👁️</span>
                  <span>Görüntüle</span>
                </button>
                <button
                  onClick={() => handleDelete(cl.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <span>🗑️</span>
                  <span>Sil</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedLetter && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[80vh] overflow-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedLetter.companyName} - {selectedLetter.position}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-b dark:border-gray-700 flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-1"
              >
                <span>📋</span>
                <span>Kopyala</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center space-x-1"
              >
                <span>💾</span>
                <span>İndir</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-300">
                {selectedLetter.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
