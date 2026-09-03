import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AppHeader from './components/AppHeader';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import FacilityDetailPage from './pages/FacilityDetailPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-stone-50 dark:bg-forest-950 text-stone-900 dark:text-stone-100">
          <AppHeader />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/facility/:id" element={<FacilityDetailPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
