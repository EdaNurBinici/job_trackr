import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Icon from '../components/Icon';
import { useLanguage } from '../context/LanguageContext';
interface CVFile {
  id: string;
  fileName: string;
}
export default function CoverLetterGenerator() {
  const { user: _user } = useAuth();
  const { tx, language: uiLanguage } = useLanguage();
  const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
  const [hiddenCvs, setHiddenCvs] = useState<string[]>([]);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'creative'>('formal');
  const [language, setLanguage] = useState<'tr' | 'en'>(uiLanguage);
  const [generating, setGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coverLetterId, setCoverLetterId] = useState('');
  useEffect(() => {
    loadCVs();
  }, []);
  // Arayüz dili değişince ön yazı dili de onu takip etsin (kullanıcı sonradan değiştirebilir)
  useEffect(() => {
    setLanguage(uiLanguage);
  }, [uiLanguage]);
  const loadCVs = async () => {
    try {
      const response = await api.get('/cv/user/list');
      const pdfFiles = response.data.data.filter(
        (cv: any) => cv.mimeType === 'application/pdf'
      );
      setCvFiles(pdfFiles);
      setHiddenCvs(
        response.data.data
          .filter((cv: any) => cv.mimeType !== 'application/pdf')
          .map((cv: any) => cv.fileName)
      );
    } catch (err: any) {
      setError(tx('CV listesi yüklenemedi', 'Could not load your CV list'));
    }
  };
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCVId) {
      setError(tx('Lütfen bir CV seçin', 'Please select a CV'));
      return;
    }
    if (jobDescription.trim().length < 50) {
      setError(tx('İş ilanı açıklaması en az 50 karakter olmalıdır', 'The job description must be at least 50 characters'));
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
      setSuccess(tx('Ön yazı başarıyla oluşturuldu!', 'Cover letter created!'));
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          tx('Ön yazı oluşturulamadı. Lütfen tekrar deneyin.', 'Could not create the cover letter. Please try again.')
      );
    } finally {
      setGenerating(false);
    }
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setSuccess(tx('Panoya kopyalandı!', 'Copied to clipboard!'));
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
    setSuccess(tx('İndirildi!', 'Downloaded!'));
    setTimeout(() => setSuccess(''), 3000);
  };
  const handleSaveEdit = async () => {
    if (!coverLetterId) return;
    try {
      await api.put(`/cover-letter/${coverLetterId}`, {
        content: coverLetter,
      });
      setSuccess(tx('Değişiklikler kaydedildi!', 'Changes saved!'));
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(tx('Kaydetme başarısız oldu', 'Saving failed'));
    }
  };
  return (
    <div className="p-5 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white"><Icon name="pen" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Ön Yazı Oluştur', 'Cover Letter Generator')}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{tx('AI ile kişiselleştirilmiş ön yazı (cover letter) oluşturun!', 'Create a personalized cover letter with AI!')}</p>
      {}
      <div className="mt-8 p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <form onSubmit={handleGenerate}>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('CV Seçin (Sadece PDF)', 'Select a CV (PDF only)')}
            </label>
            <select
              value={selectedCVId}
              onChange={(e) => setSelectedCVId(e.target.value)}
              required
              disabled={generating}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{tx('-- CV Seçin --', '-- Select a CV --')}</option>
              {cvFiles.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.fileName}
                </option>
              ))}
            </select>
            {hiddenCvs.length > 0 && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {tx(`${hiddenCvs.length} CV PDF olmadığı için burada listelenmiyor: ${hiddenCvs.join(', ')}. AI analizi yalnızca PDF destekler, bu dosyanın PDF halini CV Yönetimi sayfasından yükleyin.`, `${hiddenCvs.length} file(s) are hidden because they are not PDF: ${hiddenCvs.join(', ')}. AI features support PDF only, please upload a PDF version.`)}
              </p>
            )}
          </div>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('Şirket Adı', 'Company Name')}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={generating}
              placeholder={tx('Örn: Google', 'e.g. Google')}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('Pozisyon', 'Position')}
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
              disabled={generating}
              placeholder={tx('Örn: Senior Software Engineer', 'e.g. Senior Software Engineer')}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('İş İlanı Açıklaması (Min 50 karakter)', 'Job Description (min. 50 characters)')}
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              minLength={50}
              disabled={generating}
              rows={8}
              placeholder={tx('İş ilanının tamamını buraya yapıştırın...', 'Paste the full job posting here...')}
              className="w-full px-4 py-2.5 text-base rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {jobDescription.length} / 50 {tx('karakter', 'characters')}
            </p>
          </div>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('Ton', 'Tone')}
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
                <Icon name="briefcase" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Resmi', 'Formal')}
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
                <Icon name="smile" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Samimi', 'Friendly')}
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
                <Icon name="palette" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Yaratıcı', 'Creative')}
              </label>
            </div>
          </div>
          {}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-gray-900 dark:text-white">
              {tx('Dil', 'Language')}
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
                {tx('Türkçe', 'Turkish')}
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
                English
              </label>
            </div>
          </div>
          {}
          <button
            type="submit"
            disabled={generating || cvFiles.length === 0}
            className={`w-full px-8 py-4 text-lg rounded ${
              generating || cvFiles.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 cursor-pointer'
            } text-white border-none`}
          >
            {generating ? tx('Oluşturuluyor...', 'Generating...') : tx('Ön Yazı Oluştur', 'Generate Cover Letter')}
          </button>
        </form>
      </div>
      {}
      {success && (
        <div className="mt-5 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded border border-green-300 dark:border-green-800">
          {success}
        </div>
      )}
      {}
      {error && (
        <div className="mt-5 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded border border-red-300 dark:border-red-800">
          <Icon name="x" className="w-[1.1em] h-[1.1em] mr-1.5" />{error}
        </div>
      )}
      {}
      {coverLetter && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white"><Icon name="doc" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Ön Yazınız', 'Your Cover Letter')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
              >
                {isEditing ? tx('Önizle', 'Preview') : tx('Düzenle', 'Edit')}
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded cursor-pointer"
              >
                <Icon name="clipboard" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Kopyala', 'Copy')}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded cursor-pointer"
              >
                <Icon name="save" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('İndir', 'Download')}
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
                <Icon name="save" className="w-[1.1em] h-[1.1em] mr-1.5" />{tx('Değişiklikleri Kaydet', 'Save Changes')}
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
