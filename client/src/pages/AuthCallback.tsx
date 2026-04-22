import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Missing JWT payload');
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  return JSON.parse(atob(padded));
};

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
      localStorage.setItem('token', token);

      try {
        const payload = decodeJwtPayload(token);
        const user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        };

        localStorage.setItem('user', JSON.stringify(user));
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
