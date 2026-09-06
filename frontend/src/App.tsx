import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import LandingPage from './pages/LandingPage';
import AnalysisPage from './pages/AnalysisPage';
import DashboardPage from './pages/DashboardPage';
import FacilityDetailPage from './pages/FacilityDetailPage';
import ReportPage from './pages/ReportPage';
import MethodologyPage from './pages/MethodologyPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-carbon-900 text-slate-100">
        <AppHeader />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/facility/:id" element={<FacilityDetailPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
