import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { applicationsApi } from '../services/api';
import type { ApplicationStatus } from '../types';
import Icon from '../components/Icon';
export const ApplicationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    status: 'Applied' as ApplicationStatus,
    applicationDate: new Date().toISOString().split('T')[0],
    location: '',
    jobDescription: '',
    notes: '',
    reminderDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isEdit) {
      loadApplication();
    } else if (location.state?.fromShare || location.state?.fromLink) {
      const { jobUrl, jobTitle } = location.state;
      setFormData(prev => ({
        ...prev,
        position: jobTitle || '',
        notes: jobUrl ? `İlan Linki: ${jobUrl}` : '',
      }));
    }
  }, [id, location.state]);
  const loadApplication = async () => {
    try {
      const response = await applicationsApi.getById(id!);
      const app = response.data.data;
      setFormData({
        companyName: app.companyName,
        position: app.position,
        status: app.status,
        applicationDate: app.applicationDate,
        location: app.location || '',
        jobDescription: app.jobDescription || '',
        notes: app.notes || '',
        reminderDate: app.reminderDate || '',
      });
    } catch (error) {
      console.error('Failed to load application:', error);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const submitData: any = {
        companyName: formData.companyName,
        position: formData.position,
        status: formData.status,
        applicationDate: formData.applicationDate,
      };
      if (formData.location?.trim()) {
        submitData.location = formData.location.trim();
      }
      if (formData.jobDescription?.trim()) {
        submitData.jobDescription = formData.jobDescription.trim();
      }
      if (formData.notes?.trim()) {
        submitData.notes = formData.notes.trim();
      }
      if (formData.reminderDate) {
        submitData.reminderDate = formData.reminderDate;
      }
      if (isEdit) {
        await applicationsApi.update(id!, submitData);
      } else {
        await applicationsApi.create(submitData);
      }
      navigate('/applications');
    } catch (err: any) {
      console.error('Form submit error:', err);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Başvuru kaydedilemedi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const statusStyles: Record<string, { active: string }> = {
    blue: { active: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200' },
    yellow: { active: 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200' },
    green: { active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' },
    red: { active: 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200' },
  };
  const statusOptions = [
    { value: 'Applied', label: 'Başvuruldu', icon: 'note', color: 'blue' },
    { value: 'Interview', label: 'Mülakat', icon: 'briefcase', color: 'yellow' },
    { value: 'Offer', label: 'Teklif', icon: 'party', color: 'green' },
    { value: 'Rejected', label: 'Reddedildi', icon: 'x', color: 'red' },
  ];
  return (
    <div className="max-w-4xl mx-auto">
      {}
      <div className="mb-8">
        <button
          onClick={() => navigate('/applications')}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-4 flex items-center space-x-2 transition-colors"
        >
          <span>←</span>
          <span>Geri Dön</span>
        </button>
        <h1 className="page-title">
          {isEdit ? 'Başvuruyu Düzenle' : 'Yeni Başvuru'}
        </h1>
        <p className="page-subtitle">
          {isEdit ? 'Başvuru bilgilerini güncelleyin' : 'Yeni iş başvurunuzu kaydedin'}
        </p>
      </div>
      {}
      <div className="card p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="companyName" className="field-label">
                Şirket Adı <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Örn: Google, Microsoft"
              />
            </div>
            <div>
              <label htmlFor="position" className="field-label">
                Pozisyon <span className="text-red-500">*</span>
              </label>
              <input
                id="position"
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Örn: Frontend Developer"
              />
            </div>
          </div>
          {}
          <div>
            <label className="field-label">
              Durum <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: option.value as ApplicationStatus })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    formData.status === option.value
                      ? statusStyles[option.color].active
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1 flex justify-center"><Icon name={option.icon} /></div>
                  <div className="text-sm font-semibold">
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="applicationDate" className="field-label">
                Başvuru Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                id="applicationDate"
                type="date"
                name="applicationDate"
                value={formData.applicationDate}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="reminderDate" className="field-label">
                Hatırlatma Tarihi
              </label>
              <input
                id="reminderDate"
                type="date"
                name="reminderDate"
                value={formData.reminderDate}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="location" className="field-label">
                Lokasyon
              </label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input-field"
                placeholder="Örn: İstanbul, Remote"
              />
            </div>
          </div>
          {}
          <div>
            <label htmlFor="jobDescription" className="field-label">
              İş Açıklaması
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              rows={4}
              className="input-field resize-none"
              placeholder="İş tanımı, gereksinimler, sorumluluklar..."
            />
          </div>
          {}
          <div>
            <label htmlFor="notes" className="field-label">
              Notlar
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="input-field resize-none"
              placeholder="Mülakat notları, iletişim bilgileri, özel notlar..."
            />
          </div>
          {}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="btn-secondary px-6 py-2.5"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2"><Icon name="save" /></span>
                  {isEdit ? 'Güncelle' : 'Kaydet'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
      {}
      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
        <div className="flex items-start space-x-3">
          <span className="text-2xl"><Icon name="lightbulb" /></span>
          <div className="text-sm text-indigo-800 dark:text-indigo-200">
            <p className="font-medium mb-1">İpucu:</p>
            <p>Başvuru sonrası mülakat tarihi geldiğinde hatırlatma alabilmek için hatırlatma tarihi ekleyebilirsiniz.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
