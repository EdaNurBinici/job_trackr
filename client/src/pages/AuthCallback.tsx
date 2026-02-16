import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      // Token'ı localStorage'a kaydet
      localStorage.setItem('token', token);

      // Token'dan kullanıcı bilgilerini çıkar (JWT decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        };
        
        // User'ı da localStorage'a kaydet
        localStorage.setItem('user', JSON.stringify(user));

        // Dashboard'a yönlendir (sayfa yenilenecek ve AuthContext otomatik yükleyecek)
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Token parse error:', err);
        navigate('/login?error=invalid_token');
      }
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl mb-4 animate-pulse">
          <span className="text-white text-3xl font-bold">JT</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Giriş yapılıyor...</h2>
        <p className="text-gray-600">Lütfen bekleyin</p>
      </div>
    </div>
  );
};
