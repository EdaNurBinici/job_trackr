import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { applicationsApi } from '../services/api';
import type { ApplicationStatus } from '../types';

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
    } else if (location.state?.fromShare) {
      // Pre-fill from share data
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
      // Prepare data - remove empty optional fields
      const submitData: any = {
        companyName: formData.companyName,
        position: formData.position,
        status: formData.status,
        applicationDate: formData.applicationDate,
      };

      // Only add optional fields if they have values
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

  const statusOptions = [
    { value: 'Applied', label: 'Başvuruldu', icon: '📝', color: 'blue' },
    { value: 'Interview', label: 'Mülakat', icon: '💼', color: 'yellow' },
    { value: 'Offer', label: 'Teklif', icon: '🎉', color: 'green' },
    { value: 'Rejected', label: 'Reddedildi', icon: '❌', color: 'red' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/applications')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center space-x-2 transition-colors"
        >
          <span>←</span>
          <span>Geri Dön</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? '✏️ Başvuruyu Düzenle' : '➕ Yeni Başvuru'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEdit ? 'Başvuru bilgilerini güncelleyin' : 'Yeni iş başvurunuzu kaydedin'}
        </p>
      </div>

      {/* Form Card */}
      <div className="card p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company & Position - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Status - Visual Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Durum <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: option.value as ApplicationStatus })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.status === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className={`text-sm font-medium ${
                    formData.status === option.value ? `text-${option.color}-700` : 'text-gray-700'
                  }`}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates & Location - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="applicationDate" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Job Description */}
          <div>
            <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
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
                  <span className="mr-2">💾</span>
                  {isEdit ? 'Güncelle' : 'Kaydet'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">İpucu:</p>
            <p>Başvuru sonrası mülakat tarihi geldiğinde hatırlatma alabilmek için hatırlatma tarihi ekleyebilirsiniz.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
