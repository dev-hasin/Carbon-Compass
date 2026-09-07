import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AnalysisPage from './pages/AnalysisPage';
import DashboardPage from './pages/DashboardPage';
import FacilityDetailPage from './pages/FacilityDetailPage';
import ReportPage from './pages/ReportPage';
import MethodologyPage from './pages/MethodologyPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <div className="min-h-screen bg-carbon-900 text-slate-100">
          <AppHeader />
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />

            {/* Signed-in users (exporters + admins) */}
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/facility/:id"
              element={
                <ProtectedRoute>
                  <FacilityDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/:id"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
