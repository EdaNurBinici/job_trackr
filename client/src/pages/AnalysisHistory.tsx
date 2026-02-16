import { useState, useEffect } from 'react';
import api from '../services/api';

interface Analysis {
  id: string;
  cvFileId: string;
  matchScore: number;
  jobUrl?: string;
  createdAt: string;
}

interface AnalysisDetail {
  id: string;
  cvFileId: string;
  jobDescription: string;
  jobUrl?: string;
  matchScore: number;
  missingSkills: string[];
  recommendations: string[];
  createdAt: string;
}

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cv-analysis/user/list');
      setAnalyses(response.data.data);
      setError('');
    } catch (err: any) {
      setError('Analiz geçmişi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (analysisId: string) => {
    // Aynı analize tekrar tıklanırsa kapat
    if (selectedAnalysis?.id === analysisId) {
      setSelectedAnalysis(null);
      return;
    }

    try {
      const response = await api.get(`/cv-analysis/${analysisId}`);
      setSelectedAnalysis(response.data.data);
    } catch (err: any) {
      setError('Analiz detayı yüklenemedi');
    }
  };

  const handleDelete = async (analysisId: string) => {
    if (!confirm('Bu analizi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/cv-analysis/${analysisId}`);
      loadAnalyses();
      if (selectedAnalysis?.id === analysisId) {
        setSelectedAnalysis(null);
      }
    } catch (err: any) {
      setError('Analiz silinemedi');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📚 Analiz Geçmişi</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Geçmiş CV analizlerinizi görüntüleyin</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg border border-red-300 dark:border-red-800">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analizler ({analyses.length})</h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : analyses.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Henüz analiz yapmadınız.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className={`card p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    selectedAnalysis?.id === analysis.id
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                      : ''
                  }`}
                  onClick={() => handleView(analysis.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div
                        className="text-4xl font-bold mb-2"
                        style={{ color: getScoreColor(analysis.matchScore) }}
                      >
                        {analysis.matchScore}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📅 {new Date(analysis.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                      {analysis.jobUrl && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 break-all">
                          🔗 {analysis.jobUrl.substring(0, 40)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(analysis.id);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detaylar</h2>
          
          {!selectedAnalysis ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👁️</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Detayları görmek için bir analiz seçin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score */}
              <div
                className="card p-6 text-center"
                style={{ borderColor: getScoreColor(selectedAnalysis.matchScore), borderWidth: '2px' }}
              >
                <div
                  className="text-5xl font-bold"
                  style={{ color: getScoreColor(selectedAnalysis.matchScore) }}
                >
                  {selectedAnalysis.matchScore} / 100
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Uyum Skoru</p>
              </div>

              {/* Job Description */}
              <div className="card p-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">📋 İş İlanı</h3>
                <p className="max-h-40 overflow-auto text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-3">
                  {selectedAnalysis.jobDescription}
                </p>
                {selectedAnalysis.jobUrl && (
                  <a
                    href={selectedAnalysis.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center"
                  >
                    🔗 İlanı Görüntüle
                  </a>
                )}
              </div>

              {/* Missing Skills */}
              {selectedAnalysis.missingSkills.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">❌ Eksik Beceriler</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.missingSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedAnalysis.recommendations.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">💡 Öneriler</h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {selectedAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
