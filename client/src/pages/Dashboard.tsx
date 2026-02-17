import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, applicationsApi } from '../services/api';
import type { DashboardStats, Application } from '../types';
import AddJobByLink from '../components/AddJobByLink';

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Application[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<string>('');
  const [modalApplications, setModalApplications] = useState<Application[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadDashboard();

    // Auto-refresh when window regains focus
    const handleFocus = () => {
      loadDashboard();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(),
      ]);
      setStats(statsRes.data.data);
      setRecentActivity(activityRes.data.data);
      
      // Filter upcoming reminders (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const reminders = activityRes.data.data.filter((app: Application) => {
        if (!app.reminderDate) return false;
        const reminderDate = new Date(app.reminderDate);
        return reminderDate >= today && reminderDate <= nextWeek;
      }).sort((a: Application, b: Application) => 
        new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime()
      );
      setUpcomingReminders(reminders);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (status: string) => {
    setModalStatus(status);
    setModalOpen(true);
    setModalLoading(true);
    
    try {
      const response = await applicationsApi.getAll({ status: status as any });
      setModalApplications(response.data.data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalApplications([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu başvuruyu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await applicationsApi.delete(id);
      setModalApplications(modalApplications.filter(app => app.id !== id));
      loadDashboard(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete application:', error);
      alert('Silme işlemi başarısız oldu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Toplam Başvuru',
      value: stats?.total || 0,
      icon: '📊',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      filterStatus: '',
    },
    {
      title: 'Mülakat',
      value: stats?.interview || 0,
      icon: '💼',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      filterStatus: 'Interview',
    },
    {
      title: 'Teklif',
      value: stats?.offer || 0,
      icon: '🎉',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      filterStatus: 'Offer',
    },
    {
      title: 'Reddedildi',
      value: stats?.rejected || 0,
      icon: '❌',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      filterStatus: 'Rejected',
    },
  ];

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'Applied': 'Başvuruldu',
      'Interview': 'Mülakat',
      'Offer': 'Teklif',
      'Rejected': 'Reddedildi',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      Applied: 'bg-blue-100 text-blue-700',
      Interview: 'bg-yellow-100 text-yellow-700',
      Offer: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">İş başvurularınızın özeti</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="btn-secondary flex items-center justify-center space-x-2"
            title="Yenile"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>Yenile</span>
          </button>
          <Link
            to="/applications/new"
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <span>➕</span>
            <span>Yeni Başvuru</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <button
            key={index}
            onClick={() => card.filterStatus && openModal(card.filterStatus)}
            className="card p-6 hover:scale-105 transition-transform duration-200 cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`w-14 h-14 ${card.bgColor} dark:bg-opacity-10 rounded-xl flex items-center justify-center`}>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
            <div className={`mt-4 h-2 bg-gradient-to-r ${card.color} rounded-full`}></div>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Son Aktiviteler</h2>
          <Link
            to="/applications"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Tümünü Gör →
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz başvuru yok</p>
            <Link to="/applications/new" className="btn-primary inline-flex items-center space-x-2">
              <span>➕</span>
              <span>İlk Başvurunuzu Ekleyin</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((app) => (
              <Link
                key={app.id}
                to={`/applications/${app.id}`}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{app.companyName}</h3>
                      <span className={`badge ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{app.position}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(app.applicationDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-gray-400 dark:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/cv-analysis"
          className="card p-6 hover:scale-105 transition-transform duration-200 group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">AI CV Analizi</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">CV'nizi yapay zeka ile analiz edin</p>
        </Link>

        <Link
          to="/cover-letter-generator"
          className="card p-6 hover:scale-105 transition-transform duration-200 group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="text-2xl">✍️</span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ön Yazı Oluştur</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">AI ile özel ön yazı hazırlayın</p>
        </Link>

        <Link
          to="/cv"
          className="card p-6 hover:scale-105 transition-transform duration-200 group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="text-2xl">📄</span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">CV Yönetimi</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">CV'lerinizi yükleyin ve yönetin</p>
        </Link>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yaklaşan Hatırlatmalar</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Önümüzdeki 7 gün</p>
              </div>
            </div>
            <span className="badge bg-orange-100 text-orange-700">
              {upcomingReminders.length} hatırlatma
            </span>
          </div>

          <div className="space-y-3">
            {upcomingReminders.map((app) => {
              const reminderDate = new Date(app.reminderDate!);
              const today = new Date();
              const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isToday = daysUntil === 0;
              const isTomorrow = daysUntil === 1;

              return (
                <Link
                  key={app.id}
                  to={`/applications/${app.id}`}
                  className="block p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{app.companyName}</h3>
                        <span className={`badge ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{app.position}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                          {isToday ? '🔥 Bugün!' : isTomorrow ? '⏰ Yarın' : `📅 ${daysUntil} gün sonra`}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          ({reminderDate.toLocaleDateString('tr-TR')})
                        </span>
                      </div>
                    </div>
                    <div className="text-gray-400 dark:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getStatusLabel(modalStatus)} Başvurular
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : modalApplications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">Bu durumda başvuru bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{app.companyName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{app.position}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(app.applicationDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Job By Link - Mobile Only */}
      <AddJobByLink />
    </div>
  );
};
