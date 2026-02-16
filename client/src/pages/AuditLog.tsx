import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import type { AuditEntry } from '../types';

export const AuditLog = () => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
    search: '',
  });

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    try {
      const response = await adminApi.getAuditLog();
      setAuditLog(response.data.data);
    } catch (error) {
      console.error('Failed to load audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLog = auditLog.filter((entry) => {
    if (filter.action && entry.action !== filter.action) return false;
    if (filter.entityType && entry.entityType !== filter.entityType) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        entry.userEmail?.toLowerCase().includes(searchLower) ||
        entry.entityId.toLowerCase().includes(searchLower) ||
        entry.action.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const uniqueActions = [...new Set(auditLog.map((e) => e.action))];
  const uniqueEntityTypes = [...new Set(auditLog.map((e) => e.entityType))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Denetim Günlüğü</h1>
        <p className="mt-1 text-gray-600">Sistemdeki tüm değişikliklerin kaydı</p>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Ara (email, ID, aksiyon)..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="input-field"
          />
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="input-field"
          >
            <option value="">Tüm Aksiyonlar</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            className="input-field"
          >
            <option value="">Tüm Tipler</option>
            {uniqueEntityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {(filter.action || filter.entityType || filter.search) && (
            <button
              onClick={() => setFilter({ action: '', entityType: '', search: '' })}
              className="btn-secondary"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 mb-1">Toplam Kayıt</p>
          <p className="text-3xl font-bold text-gray-900">{auditLog.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 mb-1">Filtrelenmiş</p>
          <p className="text-3xl font-bold text-gray-900">{filteredLog.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 mb-1">Aksiyon Tipi</p>
          <p className="text-3xl font-bold text-gray-900">{uniqueActions.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 mb-1">Entity Tipi</p>
          <p className="text-3xl font-bold text-gray-900">{uniqueEntityTypes.length}</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tarih</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Kullanıcı</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Aksiyon</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tip</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Entity ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Değişiklikler</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(entry.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{entry.userEmail || entry.userId}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        entry.action === 'CREATE' ? 'bg-blue-100 text-blue-700' :
                        entry.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                        entry.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{entry.entityType}</td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-600">
                      {entry.entityId.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      {entry.action === 'UPDATE' && entry.before && entry.after ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm text-blue-600 hover:text-blue-700">
                            Detayları Gör
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                            <div className="font-semibold text-gray-700 mb-1">Önce:</div>
                            <pre className="whitespace-pre-wrap text-gray-600 mb-2">
                              {JSON.stringify(entry.before, null, 2)}
                            </pre>
                            <div className="font-semibold text-gray-700 mb-1">Sonra:</div>
                            <pre className="whitespace-pre-wrap text-gray-600">
                              {JSON.stringify(entry.after, null, 2)}
                            </pre>
                          </div>
                        </details>
                      ) : entry.action === 'CREATE' && entry.after ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm text-blue-600 hover:text-blue-700">
                            Detayları Gör
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                            <pre className="whitespace-pre-wrap text-gray-600">
                              {JSON.stringify(entry.after, null, 2)}
                            </pre>
                          </div>
                        </details>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
