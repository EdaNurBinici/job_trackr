import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { applicationsApi, cvApi } from '../services/api';
import type { Application } from '../types';
import FitScoreAnalysis from '../components/FitScoreAnalysis';
export const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [cvFiles, setCvFiles] = useState<any[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  useEffect(() => {
    loadApplication();
    loadCVFiles();
  }, [id]);
  const loadApplication = async () => {
    try {
      const response = await applicationsApi.getById(id!);
      setApplication(response.data.data);
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadCVFiles = async () => {
    try {
      const response = await cvApi.getUserCVs();
      const cvData = response.data.data || response.data || [];
      setCvFiles(cvData);
      if (cvData.length > 0) {
        setSelectedCvId(cvData[0].id);
      }
    } catch (error) {
      console.error('Failed to load CV files:', error);
    }
  };
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await applicationsApi.delete(id!);
      navigate('/applications');
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  if (!application) return (
    <div className="card p-12 text-center">
      <p className="text-gray-600 dark:text-gray-400">Başvuru bulunamadı</p>
    </div>
  );
  return (
    <div className="space-y-6">
      {}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{application.companyName}</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">{application.position}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/applications/${id}/edit`}>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1">
                <span>✏️</span>
                <span>Düzenle</span>
              </button>
            </Link>
            <button 
              onClick={handleDelete} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1"
            >
              <span>🗑️</span>
              <span>Sil</span>
            </button>
          </div>
        </div>
        {}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          application.status === 'Offer' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
          application.status === 'Interview' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
          application.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
        }`}>
          {application.status === 'Applied' && '📝'}
          {application.status === 'Interview' && '💼'}
          {application.status === 'Offer' && '🎉'}
          {application.status === 'Rejected' && '❌'}
          {' '}{application.status}
        </div>
      </div>
      {}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📋 Detaylar</h2>
        <div className="space-y-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700 pb-3">
            <span className="font-medium text-gray-700 dark:text-gray-300 w-40">📅 Başvuru Tarihi:</span>
            <span className="text-gray-900 dark:text-white">{new Date(application.applicationDate).toLocaleDateString('tr-TR')}</span>
          </div>
          {application.location && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="font-medium text-gray-700 dark:text-gray-300 w-40">📍 Lokasyon:</span>
              <span className="text-gray-900 dark:text-white">{application.location}</span>
            </div>
          )}
          {application.reminderDate && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="font-medium text-gray-700 dark:text-gray-300 w-40">⏰ Hatırlatma:</span>
              <span className="text-gray-900 dark:text-white">{new Date(application.reminderDate).toLocaleDateString('tr-TR')}</span>
            </div>
          )}
          <div className="flex border-b border-gray-200 dark:border-gray-700 pb-3">
            <span className="font-medium text-gray-700 dark:text-gray-300 w-40">🕐 Oluşturulma:</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">{new Date(application.createdAt).toLocaleString('tr-TR')}</span>
          </div>
          <div className="flex">
            <span className="font-medium text-gray-700 dark:text-gray-300 w-40">🔄 Güncellenme:</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">{new Date(application.updatedAt).toLocaleString('tr-TR')}</span>
          </div>
        </div>
      </div>
      {}
      {application.jobDescription && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📄 İş İlanı Açıklaması</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{application.jobDescription}</p>
          </div>
        </div>
      )}
      {}
      {application.notes && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">📝 Notlar</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{application.notes}</p>
        </div>
      )}
      {}
      {application.jobDescription && (
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            🎯 AI Fit Score Analizi
          </h2>
          {cvFiles.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📄 CV'nizi Seçin:
                </label>
                <select 
                  value={selectedCvId}
                  onChange={(e) => setSelectedCvId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {cvFiles.map(cv => (
                    <option key={cv.id} value={cv.id}>
                      {cv.fileName}
                    </option>
                  ))}
                </select>
              </div>
              <FitScoreAnalysis 
                applicationId={id!} 
                cvFileId={selectedCvId}
              />
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg p-6 text-center">
              <p className="text-lg text-yellow-800 dark:text-yellow-400 mb-3">
                CV bulunamadı. Analiz için önce bir CV yüklemelisiniz.
              </p>
              <Link 
                to="/cv" 
                className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
              >
                ⬆️ CV Yükle
              </Link>
            </div>
          )}
        </div>
      )}
      {!application.jobDescription && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-800 rounded-lg p-6 text-center">
          <p className="text-lg text-orange-800 dark:text-orange-400 mb-3">
            ⚠️ İş ilanı açıklaması bulunamadı. AI analizi için iş ilanı açıklaması gereklidir.
          </p>
          <Link 
            to={`/applications/${id}/edit`}
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            ✏️ İş İlanı Ekle
          </Link>
        </div>
      )}
      {}
      <div className="text-center">
        <Link to="/applications">
          <button className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium">
            ← Başvurulara Dön
          </button>
        </Link>
      </div>
    </div>
  );
};
