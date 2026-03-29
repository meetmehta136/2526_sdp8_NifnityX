import { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import BrokerKeys from "@/pages/BrokerKeys";
import Dashboard from "@/pages/Dashboard";
import TradeHistory from "@/pages/TradeHistory";
import StrategyTuner from "@/pages/StrategyTuner";
import Account from "@/pages/Dashboard/Account";
import Analytics from "@/pages/Dashboard/Analytics";
import News from "@/pages/News";
import Signals from "@/pages/Signals";
import SettingsPage from "@/pages/Settings";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthenticated === null) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ?
              <Navigate to="/dashboard" replace /> :
              <Login onLoginSuccess={checkAuth} />
          }
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
        />

        {/* Protected Routes */}
        <Route element={isAuthenticated ? <DashboardLayout user={user} /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/news" element={<News />} />
          <Route path="/history" element={<TradeHistory />} />
          <Route path="/strategy" element={<StrategyTuner />} />
          <Route path="/account" element={<Account />} />
          <Route path="/broker" element={<BrokerKeys />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
      <Toaster />
    </Router>
  );
}

// ── Premium Splash Screen ──
function SplashScreen() {
  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in-scale">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25 animate-pulse-glow">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">NifnityX</h1>
        <p className="text-xs text-zinc-600 font-medium tracking-widest uppercase">Algorithmic Trading Platform</p>
      </div>

      {/* Loading bar */}
      <div className="relative z-10 mt-8 w-48 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-shimmer" />
      </div>
    </div>
  );
}

export default App;