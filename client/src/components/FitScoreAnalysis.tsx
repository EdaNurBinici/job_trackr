/**
 * Fit Score Analysis Component
 * Sprint 1: Display AI-powered fit score analysis
 */

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { applicationAnalysisApi } from '../services/api';
import type { ApplicationAnalysis } from '../types';

interface FitScoreAnalysisProps {
  applicationId: string;
  cvFileId?: string;
}

export default function FitScoreAnalysis({ applicationId, cvFileId }: FitScoreAnalysisProps) {
  const [analysis, setAnalysis] = useState<ApplicationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!cvFileId) {
      setError('Lütfen bir CV seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await applicationAnalysisApi.analyzeApplication(applicationId, cvFileId, 'tr');
      const analysisData = response.data.data || response.data;
      setAnalysis(analysisData);
      
      // Skor 85'in üzerindeyse konfeti patlat! 🎉
      if (analysisData.fitScore >= 85) {
        triggerConfetti();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Sol taraftan konfeti
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      // Sağ taraftan konfeti
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  const getFitScoreLabel = (score: number) => {
    if (score >= 90) return 'Mükemmel Eşleşme';
    if (score >= 75) return 'Güçlü Eşleşme';
    if (score >= 60) return 'İyi Eşleşme';
    if (score >= 40) return 'Orta Eşleşme';
    return 'Zayıf Eşleşme';
  };

  return (
    <div className="space-y-4">
      {/* Analyze Button */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={loading || !cvFileId}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Analiz Ediliyor...
            </span>
          ) : (
            '🚀 Analiz Et'
          )}
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 font-medium">❌ {error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4 animate-fadeIn">
          {/* Fit Score Card */}
          <div className={`p-6 rounded-xl border-4 shadow-lg ${getFitScoreColor(analysis.fitScore)} relative overflow-hidden`}>
            {analysis.fitScore >= 85 && (
              <div className="absolute top-2 right-2 animate-bounce">
                <span className="text-4xl">🎉</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">Uyum Skoru</h3>
                <p className="text-lg opacity-90">{getFitScoreLabel(analysis.fitScore)}</p>
                {analysis.fitScore >= 85 && (
                  <p className="text-sm font-semibold mt-2 animate-pulse">
                    🌟 Harika! Mükemmel bir eşleşme!
                  </p>
                )}
              </div>
              <div className="text-7xl font-black">{analysis.fitScore}</div>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-green-200 dark:border-green-800 p-6 shadow-md">
              <h4 className="text-xl font-bold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
                ✅ Güçlü Yönler ({analysis.strengths.length})
              </h4>
              <div className="space-y-3">
                {analysis.strengths.map((strength, index) => (
                  <div key={index} className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500 dark:border-green-600">
                    <p className="font-semibold text-green-900 dark:text-green-300 mb-2">{strength.point}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-700 p-3 rounded border border-green-200 dark:border-green-800">
                      💬 "{strength.cv_evidence}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-orange-200 dark:border-orange-800 p-6 shadow-md">
              <h4 className="text-xl font-bold text-orange-800 dark:text-orange-400 mb-4 flex items-center gap-2">
                ⚠️ Gelişim Alanları ({analysis.gaps.length})
              </h4>
              <div className="space-y-3">
                {analysis.gaps.map((gap, index) => (
                  <div key={index} className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-500 dark:border-orange-600">
                    <p className="font-semibold text-orange-900 dark:text-orange-300 mb-2">{gap.point}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-3 rounded border border-orange-200 dark:border-orange-800">
                      📌 {gap.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6 shadow-md">
              <h4 className="text-xl font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
                💡 AI Önerileri ({analysis.suggestions.length})
              </h4>
              <ul className="space-y-3">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <span className="text-blue-600 dark:text-blue-400 text-xl font-bold">{index + 1}.</span>
                    <span className="text-gray-800 dark:text-gray-300 flex-1">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
          >
            {loading ? 'Analiz Ediliyor...' : '🔄 Yeniden Analiz Et'}
          </button>
        </div>
      )}
    </div>
  );
}
