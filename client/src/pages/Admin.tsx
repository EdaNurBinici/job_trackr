import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import type { User } from '../types';

export const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getStats(),
      ]);
      setUsers(usersRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
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
      title: 'Toplam Kullanıcı',
      value: stats?.totalUsers || 0,
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Toplam Başvuru',
      value: stats?.totalApplications || 0,
      icon: '📊',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Ort. Yanıt Süresi',
      value: stats?.averageResponseTime ? `${stats.averageResponseTime.toFixed(1)} gün` : 'N/A',
      icon: '⏱️',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Sistem geneli istatistikler ve yönetim</p>
        </div>
        <button
          onClick={() => navigate('/admin/audit')}
          className="btn-primary flex items-center space-x-2"
        >
          <span>📋</span>
          <span>Denetim Günlüğü</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-14 h-14 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
            <div className={`mt-4 h-2 bg-gradient-to-r ${card.color} rounded-full`}></div>
          </div>
        ))}
      </div>

      {/* Top Companies */}
      {stats?.topCompanies && stats.topCompanies.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">En Popüler Şirketler</h2>
          <div className="space-y-3">
            {stats.topCompanies.map((company: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{company.companyName}</span>
                </div>
                <span className="badge bg-blue-100 text-blue-700">
                  {company.count} başvuru
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Tüm Kullanıcılar</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">E-posta</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rol</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
