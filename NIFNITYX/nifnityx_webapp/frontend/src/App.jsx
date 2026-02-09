import { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner"; 
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import BrokerKeys from "@/pages/BrokerKeys"; 
import Dashboard from "@/pages/Dashboard";
import TradeHistory from "@/pages/TradeHistory"; 
import StrategyTuner from "@/pages/StrategyTuner"; // <--- Import New Page
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";

const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
    <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
    <p className="text-sm">This module is under construction.</p>
  </div>
);

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
    return <div className="h-screen w-full bg-black flex items-center justify-center text-zinc-500 text-sm">Loading NifnityX...</div>;
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
        {isAuthenticated && (
          <Route element={<DashboardLayout user={user} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
            <Route path="/history" element={<TradeHistory />} /> 
            <Route path="/strategy" element={<StrategyTuner />} /> {/* <--- Route Added */}
            <Route path="/broker" element={<BrokerKeys />} />
          </Route>
        )}

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

export default App;