import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { ApplicationList } from './pages/ApplicationList';
import { ApplicationForm } from './pages/ApplicationForm';
import { ApplicationDetail } from './pages/ApplicationDetail';
import { Admin } from './pages/Admin';
import { AuditLog } from './pages/AuditLog';
import CVManager from './pages/CVManager';
import CVAnalysis from './pages/CVAnalysis';
import AnalysisHistory from './pages/AnalysisHistory';
import CoverLetterGenerator from './pages/CoverLetterGenerator';
import CoverLetterList from './pages/CoverLetterList';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<ApplicationList />} />
            <Route path="/applications/new" element={<ApplicationForm />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/applications/:id/edit" element={<ApplicationForm />} />
            <Route path="/cv" element={<CVManager />} />
            <Route path="/cv-manager" element={<CVManager />} />
            <Route path="/cv-analysis" element={<CVAnalysis />} />
            <Route path="/analysis-history" element={<AnalysisHistory />} />
            <Route path="/cover-letter-generator" element={<CoverLetterGenerator />} />
            <Route path="/cover-letters" element={<CoverLetterList />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><AuditLog /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
