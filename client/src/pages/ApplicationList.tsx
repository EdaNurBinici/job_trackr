import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStatus } from '../types';

export const ApplicationList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initialize status filter from URL
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl as ApplicationStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    loadApplications();
  }, [search, statusFilter]);

  const loadApplications = async () => {
    try {
      setError('');
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const response = await applicationsApi.getAll(params);
      setApplications(response.data.data);
    } catch (error: any) {
      console.error('Failed to load applications:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    
    try {
      await applicationsApi.delete(id);
      loadApplications();
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">Hata: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Başvurularım</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Tüm iş başvurularınız</p>
        </div>
        <Link to="/applications/new" className="btn-primary flex items-center space-x-2">
          <span>➕</span>
          <span>Yeni Başvuru</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="🔍 Şirket veya pozisyon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              const newStatus = e.target.value as ApplicationStatus | '';
              setStatusFilter(newStatus);
              if (newStatus) {
                setSearchParams({ status: newStatus });
              } else {
                setSearchParams({});
              }
            }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Applied">Başvuruldu</option>
            <option value="Interview">Mülakat</option>
            <option value="Offer">Teklif</option>
            <option value="Rejected">Reddedildi</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {statusFilter ? `${statusFilter} durumunda başvuru bulunamadı` : 'Henüz başvuru yok'}
          </p>
          <Link to="/applications/new" className="btn-primary inline-flex items-center space-x-2">
            <span>➕</span>
            <span>İlk Başvurunuzu Ekleyin</span>
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Şirket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pozisyon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{app.companyName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{app.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        app.status === 'Offer' ? 'bg-green-100 text-green-700' :
                        app.status === 'Interview' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status === 'Applied' ? 'Başvuruldu' :
                         app.status === 'Interview' ? 'Mülakat' :
                         app.status === 'Offer' ? 'Teklif' :
                         app.status === 'Rejected' ? 'Reddedildi' : app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(app.applicationDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/applications/${app.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-colors duration-200 text-xs font-medium"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Görüntüle
                        </Link>
                        <Link
                          to={`/applications/${app.id}/edit`}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors duration-200 text-xs font-medium"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </Link>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors duration-200 text-xs font-medium"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
