import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface CVFile {
  id: string;
  fileName: string;
}

export default function CoverLetterGenerator() {
  const { user: _user } = useAuth();
  const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'creative'>('formal');
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [generating, setGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coverLetterId, setCoverLetterId] = useState('');

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

  const handleGenerate = async (e: React.FormEvent) => {
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
      setGenerating(true);
      setError('');
      setSuccess('');
      setCoverLetter('');

      const response = await api.post('/cover-letter/generate', {
        cvFileId: selectedCVId,
        companyName: companyName.trim(),
        position: position.trim(),
        jobDescription: jobDescription.trim(),
        tone,
        language,
      });

      setCoverLetter(response.data.data.content);
      setCoverLetterId(response.data.data.id);
      setSuccess('✅ Ön yazı başarıyla oluşturuldu!');
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Ön yazı oluşturulamadı. Lütfen tekrar deneyin.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setSuccess('📋 Panoya kopyalandı!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${companyName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccess('💾 İndirildi!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveEdit = async () => {
    if (!coverLetterId) return;

    try {
      await api.put(`/cover-letter/${coverLetterId}`, {
        content: coverLetter,
      });
      setSuccess('✅ Değişiklikler kaydedildi!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Kaydetme başarısız oldu');
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">✍️ Ön Yazı Oluştur</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">AI ile kişiselleştirilmiş ön yazı (cover letter) oluşturun!</p>

      {/* Generator Form */}
      <div className="mt-8 p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <form onSubmit={handleGenerate}>
          {/* CV Selection */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              CV Seçin (Sadece PDF)
            </label>
            <select
              value={selectedCVId}
              onChange={(e) => setSelectedCVId(e.target.value)}
              required
              disabled={generating}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">-- CV Seçin --</option>
              {cvFiles.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.fileName}
                </option>
              ))}
            </select>
          </div>

          {/* Company Name */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              Şirket Adı
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={generating}
              placeholder="Örn: Google"
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Position */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              Pozisyon
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
              disabled={generating}
              placeholder="Örn: Senior Software Engineer"
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Job Description */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              İş İlanı Açıklaması (Min 50 karakter)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              minLength={50}
              disabled={generating}
              rows={8}
              placeholder="İş ilanının tamamını buraya yapıştırın..."
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {jobDescription.length} / 50 karakter
            </p>
          </div>

          {/* Tone Selection */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              Ton
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer text-gray-900 dark:text-gray-300">
                <input
                  type="radio"
                  value="formal"
                  checked={tone === 'formal'}
                  onChange={(e) => setTone(e.target.value as 'formal')}
                  disabled={generating}
                  className="mr-2"
                />
                🎩 Resmi
              </label>
              <label className="flex items-center cursor-pointer text-gray-900 dark:text-gray-300">
                <input
                  type="radio"
                  value="casual"
                  checked={tone === 'casual'}
                  onChange={(e) => setTone(e.target.value as 'casual')}
                  disabled={generating}
                  className="mr-2"
                />
                😊 Samimi
              </label>
              <label className="flex items-center cursor-pointer text-gray-900 dark:text-gray-300">
                <input
                  type="radio"
                  value="creative"
                  checked={tone === 'creative'}
                  onChange={(e) => setTone(e.target.value as 'creative')}
                  disabled={generating}
                  className="mr-2"
                />
                🎨 Yaratıcı
              </label>
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              Dil
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer text-gray-900 dark:text-gray-300">
                <input
                  type="radio"
                  value="tr"
                  checked={language === 'tr'}
                  onChange={(e) => setLanguage(e.target.value as 'tr')}
                  disabled={generating}
                  className="mr-2"
                />
                🇹🇷 Türkçe
              </label>
              <label className="flex items-center cursor-pointer text-gray-900 dark:text-gray-300">
                <input
                  type="radio"
                  value="en"
                  checked={language === 'en'}
                  onChange={(e) => setLanguage(e.target.value as 'en')}
                  disabled={generating}
                  className="mr-2"
                />
                🇬🇧 English
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={generating || cvFiles.length === 0}
            className={`w-full px-8 py-4 text-lg rounded ${
              generating || cvFiles.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 cursor-pointer'
            } text-white border-none`}
          >
            {generating ? '🔄 Oluşturuluyor...' : '✨ Ön Yazı Oluştur'}
          </button>
        </form>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mt-5 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded border border-green-300 dark:border-green-800">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-5 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded border border-red-300 dark:border-red-800">
          ❌ {error}
        </div>
      )}

      {/* Cover Letter Preview */}
      {coverLetter && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📄 Ön Yazınız</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
              >
                {isEditing ? '👁️ Önizle' : '✏️ Düzenle'}
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded cursor-pointer"
              >
                📋 Kopyala
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded cursor-pointer"
              >
                💾 İndir
              </button>
            </div>
          </div>

          {isEditing ? (
            <div>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={20}
                className="w-full p-5 text-base leading-relaxed rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleSaveEdit}
                className="mt-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer"
              >
                💾 Değişiklikleri Kaydet
              </button>
            </div>
          ) : (
            <div className="p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 whitespace-pre-wrap leading-relaxed text-base text-gray-900 dark:text-gray-300">
              {coverLetter}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
