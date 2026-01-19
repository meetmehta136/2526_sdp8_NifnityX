import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from "./pages/Auth/Login.jsx"
import Signup from './pages/Auth/Signup.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import TradingViewWidget from './pages/Dashboard/NiftyChart.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path='/login'
          element={
            <Login />
          }
        />

        <Route
          path='/signup'
          element={
            <Signup />
          }
        />

        <Route
          path='/dashboard'
          element={
            <Dashboard />
          }
        />

        <Route
          path='/chart'
          element={
            <TradingViewWidget />
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
