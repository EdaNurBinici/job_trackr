import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CVList from '../components/CVList';
import api from '../services/api';

export default function CVManager() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Sadece PDF, DOCX, PNG ve JPG dosyaları yüklenebilir');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);

      await api.post('/cv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('CV başarıyla yüklendi!');
      
      // Trigger refresh of CV list
      setRefreshTrigger(prev => prev + 1);
      
      // Clear file input
      e.target.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'CV yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📄 CV Yönetimi</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Hoş geldiniz, {user?.email}!</p>
      </div>

      {/* Upload Section */}
      <div className="card p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📤</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni CV Yükle</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maksimum dosya boyutu: 10MB | İzin verilen formatlar: PDF, DOCX, PNG, JPG
            </p>
          </div>
        </div>
        
        <div className="relative">
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          />
        </div>
        
        {uploading && (
          <div className="mt-4 flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-sm font-medium">Yükleniyor...</span>
          </div>
        )}
      </div>

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

      {/* CV List Component */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">CV Listesi ({refreshTrigger >= 0 ? '' : ''})</h2>
        <CVList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
