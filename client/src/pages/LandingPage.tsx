import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
export const LandingPage = () => {
  const { theme, toggleTheme } = useTheme();
  const features = [
    {
      icon: '🎯',
      title: 'Akıllı Başvuru Takibi',
      description: 'Tüm iş başvurularınızı tek bir yerden yönetin. Durum güncellemeleri, notlar ve hatırlatmalar ile hiçbir fırsatı kaçırmayın.',
    },
    {
      icon: '🤖',
      title: 'AI CV Analizi',
      description: 'Yapay zeka ile CV\'nizi iş ilanlarına göre analiz edin. Uygunluk skorunuzu öğrenin ve eksiklerinizi görün.',
    },
    {
      icon: '✍️',
      title: 'Otomatik Ön Yazı',
      description: 'AI ile her iş ilanı için özelleştirilmiş ön yazı oluşturun. Dakikalar içinde profesyonel başvuru hazırlayın.',
    },
    {
      icon: '🔔',
      title: 'Akıllı Hatırlatmalar',
      description: 'Başvuru takibi için otomatik email hatırlatmaları alın. Hiçbir başvurunuzu unutmayın.',
    },
    {
      icon: '📊',
      title: 'Detaylı İstatistikler',
      description: 'Başvuru sürecinizi görselleştirin. Hangi aşamada olduğunuzu ve ilerlemenizi takip edin.',
    },
    {
      icon: '🌐',
      title: 'Chrome Extension',
      description: 'LinkedIn, Kariyer.net, Indeed ve Secretcv\'den tek tıkla iş ilanlarını kaydedin. Manuel veri girişine son!',
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">JT</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                JobTrackr
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-200"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm"
              >
                Ücretsiz Başla
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            İş Başvurularınızı
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Yapay Zeka ile Yönetin
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            JobTrackr ile iş başvuru sürecinizi kolaylaştırın. AI destekli CV analizi, otomatik ön yazı oluşturma ve akıllı takip sistemi ile hayalinizdeki işe ulaşın.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-4 w-full sm:w-auto"
            >
              🚀 Ücretsiz Başla
            </Link>
            <a
              href="#features"
              className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto"
            >
              📖 Özellikleri Keşfet
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            ✨ Kredi kartı gerektirmez • 🔒 Verileriniz güvende
          </p>
        </div>
      </section>
      {}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Güçlü Özellikler
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            İş arama sürecinizi kolaylaştıran ve hızlandıran özelliklerle donatıldı
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card p-6 hover:scale-105 transition-transform duration-200"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      {}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Ücretsiz</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">AI</div>
              <div className="text-blue-100">Destekli Analiz</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">∞</div>
              <div className="text-blue-100">Sınırsız Başvuru</div>
            </div>
          </div>
        </div>
      </section>
      {}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="card p-12 text-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Hayalinizdeki İşe Bugün Başlayın
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Binlerce iş arayan JobTrackr ile başvuru sürecini kolaylaştırdı. Sıra sizde!
          </p>
          <Link
            to="/register"
            className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2"
          >
            <span>🚀</span>
            <span>Hemen Ücretsiz Başla</span>
          </Link>
        </div>
      </section>
      {}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">JT</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  JobTrackr
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                İş başvuru sürecinizi yapay zeka ile kolaylaştırın. Akıllı takip, CV analizi ve daha fazlası.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Ürün</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Özellikler</a></li>
                <li><Link to="/register" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Ücretsiz Başla</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Hesap</h3>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Giriş Yap</Link></li>
                <li><Link to="/register" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Kayıt Ol</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 JobTrackr. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
};
