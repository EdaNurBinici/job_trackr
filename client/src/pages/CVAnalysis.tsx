import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
interface CVFile {
  id: string;
  fileName: string;
}
interface AnalysisResult {
  id: string;
  matchScore: number;
  missingSkills: string[];
  recommendations: string[];
  createdAt: string;
}
export default function CVAnalysis() {
  const { user: _user } = useAuth();
  const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    loadCVs();
  }, []);
  const loadCVs = async () => {
    try {
      const response = await api.get('/cv/user/list');
      const pdfFiles = response.data.data.filter(
        (cv: any) => cv.mimeType === 'application/pdf'
      );
      setCvFiles(pdfFiles);
    } catch (err: any) {
      setError('CV listesi yüklenemedi');
    }
  };
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCVId) {
      setError('Lütfen bir CV seçin');
      return;
    }
    if (jobDescription.trim().length < 50) {
      setError('İş ilanı açıklaması en az 50 karakter olmalıdır');
      return;
    }
    try {
      setAnalyzing(true);
      setError('');
      setResult(null);
      setJobId(null);
      setJobStatus('idle');
      setProgress(0);
      const response = await api.post('/cv-analysis', {
        cvFileId: selectedCVId,
        jobDescription: jobDescription.trim(),
        jobUrl: jobUrl.trim() || undefined,
      });
      if (response.status === 202 && response.data.data.jobId) {
        const newJobId = response.data.data.jobId;
        setJobId(newJobId);
        setJobStatus('queued');
        startPolling(newJobId);
      } else {
        setResult(response.data.data);
        setAnalyzing(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Analiz yapılamadı. Lütfen tekrar deneyin.'
      );
      setAnalyzing(false);
    }
  };
  const startPolling = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await api.get(`/cv-analysis/job/${jobId}`);
        const { state, progress: jobProgress, result: jobResult, failedReason } = statusRes.data.data;
        setJobStatus(state);
        setProgress(jobProgress || 0);
        if (state === 'completed') {
          clearInterval(pollInterval);
          setResult(jobResult);
          setAnalyzing(false);
          setJobStatus('completed');
        } else if (state === 'failed') {
          clearInterval(pollInterval);
          setError(failedReason || 'Analiz başarısız oldu. Lütfen tekrar deneyin.');
          setAnalyzing(false);
          setJobStatus('failed');
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        setError('Job durumu alınamadı. Lütfen sayfayı yenileyin.');
        setAnalyzing(false);
      }
    }, 2000); // Poll every 2 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      if (analyzing) {
        setError('Analiz çok uzun sürdü. Lütfen tekrar deneyin.');
        setAnalyzing(false);
      }
    }, 300000);
  };
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };
  return (
    <div className="space-y-6">
      {}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🧠 AI CV Analizi</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">CV'nizi iş ilanıyla karşılaştırın ve eşleşme puanınızı öğrenin!</p>
      </div>
      {}
      <div className="card p-6">
        <form onSubmit={handleAnalyze} className="space-y-5">
          {}
          <div>
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              CV Seçin (Sadece PDF)
            </label>
            <select
              value={selectedCVId}
              onChange={(e) => setSelectedCVId(e.target.value)}
              required
              disabled={analyzing}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">-- CV Seçin --</option>
              {cvFiles.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.fileName}
                </option>
              ))}
            </select>
            {cvFiles.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Henüz PDF CV yüklemediniz. Önce CV Yönetimi sayfasından PDF formatında CV yükleyin.
              </p>
            )}
          </div>
          {}
          <div>
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              İş İlanı Açıklaması (Min 50 karakter)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              minLength={50}
              disabled={analyzing}
              rows={10}
              placeholder="İş ilanının tamamını buraya yapıştırın..."
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
            />
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {jobDescription.length} / 50 karakter
            </p>
          </div>
          {}
          <div>
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              İlan URL (Opsiyonel)
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={analyzing}
              placeholder="https://..."
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
            />
          </div>
          {}
          <button
            type="submit"
            disabled={analyzing || cvFiles.length === 0}
            className={`w-full px-8 py-4 text-lg font-bold rounded transition-all ${
              analyzing || cvFiles.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
            } text-white`}
          >
            {analyzing ? (
              jobStatus === 'queued' ? '⏳ Sırada Bekliyor...' :
              jobStatus === 'active' ? `🔄 Analiz Ediliyor... ${progress}%` :
              '🔄 Analiz Ediliyor...'
            ) : '🚀 Analiz Et'}
          </button>
        </form>
        {}
        {analyzing && jobId && (
          <div className="mt-5">
            <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 flex items-center justify-center text-white font-bold text-sm"
                style={{ width: `${progress}%` }}
              >
                {progress > 0 && `${progress}%`}
              </div>
            </div>
            <p className="text-center mt-2 text-gray-600 dark:text-gray-400 text-sm">
              Job ID: {jobId}
            </p>
          </div>
        )}
      </div>
      {}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg border border-red-300 dark:border-red-800 flex items-start space-x-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}
      {}
      {result && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Analiz Sonuçları</h2>
          {}
          <div
            className="card p-8 text-center"
            style={{ borderColor: getScoreColor(result.matchScore), borderWidth: '2px' }}
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Eşleşme Puanı</h3>
            <div
              className="text-7xl font-black mb-2"
              style={{ color: getScoreColor(result.matchScore) }}
            >
              {result.matchScore}
            </div>
            <div className="text-2xl text-gray-600 dark:text-gray-400 mb-4">/ 100</div>
            <div
              className="inline-block px-6 py-3 rounded-lg font-bold text-gray-900 dark:text-white"
              style={{ backgroundColor: getScoreColor(result.matchScore) + '30' }}
            >
              {result.matchScore >= 80 && '🎉 Mükemmel eşleşme!'}
              {result.matchScore >= 60 && result.matchScore < 80 && '👍 İyi eşleşme'}
              {result.matchScore < 60 && '💪 Geliştirme alanları var'}
            </div>
          </div>
          {}
          {result.missingSkills.length > 0 && (
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">❌ Eksik Beceriler</h3>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {}
          {result.recommendations.length > 0 && (
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">💡 İyileştirme Önerileri</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Analiz tarihi: {new Date(result.createdAt).toLocaleString('tr-TR')}
          </p>
        </div>
      )}
    </div>
  );
}
