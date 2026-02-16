import { useState, useEffect } from 'react';
import api from '../services/api';

interface CVFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface CVListProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

export default function CVList({ onRefresh, refreshTrigger }: CVListProps) {
  const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCVs();
  }, [refreshTrigger]);

  const loadCVs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cv/user/list');
      setCvFiles(response.data.data);
      setError('');
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'CV listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cvId: string) => {
    try {
      const response = await api.get(`/cv/${cvId}`);
      const signedUrl = response.data.data.signedUrl;
      window.open(signedUrl, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'CV indirilemedi');
    }
  };

  const handleDelete = async (cvId: string, fileName: string) => {
    if (!confirm(`"${fileName}" dosyasını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await api.delete(`/cv/${cvId}`);
      setSuccess('CV başarıyla silindi');
      loadCVs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'CV silinemedi');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">CV'ler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg border border-red-300 dark:border-red-800 flex items-start space-x-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg border border-green-300 dark:border-green-800 flex items-start space-x-2">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* CV List Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Yüklü CV'ler ({cvFiles.length})
        </h3>
        <button
          onClick={loadCVs}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Yenile</span>
        </button>
      </div>

      {/* Empty State */}
      {cvFiles.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📄</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Henüz CV yüklemediniz
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Yukarıdaki yükleme alanını kullanarak ilk CV'nizi yükleyin
          </p>
        </div>
      ) : (
        /* CV Cards */
        <div className="space-y-3">
          {cvFiles.map((cv) => (
            <div
              key={cv.id}
              className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                  <span>📎</span>
                  <span className="truncate">{cv.fileName}</span>
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Boyut:</span>
                    <span>{formatFileSize(cv.fileSize)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Tip:</span>
                    <span className="uppercase">{cv.mimeType.split('/')[1]}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Yüklenme:</span>
                    <span>{formatDate(cv.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(cv.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                >
                  <span>⬇️</span>
                  <span>İndir</span>
                </button>
                <button
                  onClick={() => handleDelete(cv.id, cv.fileName)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                >
                  <span>🗑️</span>
                  <span>Sil</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
