import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { validatePassword } from '../utils/passwordValidation';
export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get('email') || '';
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordValidation = validatePassword(newPassword);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (!passwordValidation.isValid) {
      setError('Şifre gereksinimleri karşılanmıyor');
      return;
    }
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://jobtrackr-backend-fsn2.onrender.com/api';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: code,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Bir hata oluştu');
      }
      alert('Şifreniz başarıyla sıfırlandı! Giriş yapabilirsiniz.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        aria-label="Toggle Dark Mode"
      >
        <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
      </button>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl mb-4">
            <span className="text-white text-3xl font-bold">🔑</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Yeni Şifre Oluştur
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Email'inize gelen kodu kullanarak yeni şifrenizi belirleyin</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="ornek@email.com"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                6 Haneli Kod
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="input-field text-center text-2xl tracking-widest font-bold"
                placeholder="000000"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email'inize gelen 6 haneli kodu girin</p>
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={passwordValidation.requirements.minLength ? '✅' : '❌'}>
                      {passwordValidation.requirements.minLength ? '✅' : '❌'}
                    </span>
                    <span className={passwordValidation.requirements.minLength ? 'text-green-600' : 'text-gray-500'}>
                      En az 8 karakter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={passwordValidation.requirements.hasUpperCase ? '✅' : '❌'}>
                      {passwordValidation.requirements.hasUpperCase ? '✅' : '❌'}
                    </span>
                    <span className={passwordValidation.requirements.hasUpperCase ? 'text-green-600' : 'text-gray-500'}>
                      En az 1 büyük harf
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={passwordValidation.requirements.hasLowerCase ? '✅' : '❌'}>
                      {passwordValidation.requirements.hasLowerCase ? '✅' : '❌'}
                    </span>
                    <span className={passwordValidation.requirements.hasLowerCase ? 'text-green-600' : 'text-gray-500'}>
                      En az 1 küçük harf
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={passwordValidation.requirements.hasNumber ? '✅' : '❌'}>
                      {passwordValidation.requirements.hasNumber ? '✅' : '❌'}
                    </span>
                    <span className={passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                      En az 1 rakam
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={passwordValidation.requirements.hasSpecialChar ? '✅' : '❌'}>
                      {passwordValidation.requirements.hasSpecialChar ? '✅' : '❌'}
                    </span>
                    <span className={passwordValidation.requirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}>
                      En az 1 özel karakter (!@#$%^&*)
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yeni Şifre (Tekrar)
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Şifreler eşleşmiyor</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
              className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Şifre Sıfırlanıyor...
                </span>
              ) : (
                'Şifremi Sıfırla'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
