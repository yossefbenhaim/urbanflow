import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Profile from './pages/Profile'
import CommitteeDashboard from './pages/CommitteeDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import ProviderDashboard from './pages/ProviderDashboard'

// Registration pages — lazy placeholders (built by separate branches)
// These will resolve after merge
const RegisterTenant = () => (
  <div className="min-h-screen flex items-center justify-center" dir="rtl">
    <div className="text-center">
      <div className="text-4xl mb-4">🏠</div>
      <p className="text-gray-500">טוען טופס הרשמה לדייר...</p>
    </div>
  </div>
)

const RegisterManager = () => (
  <div className="min-h-screen flex items-center justify-center" dir="rtl">
    <div className="text-center">
      <div className="text-4xl mb-4">🏢</div>
      <p className="text-gray-500">טוען טופס הרשמה למנהל...</p>
    </div>
  </div>
)

const RegisterProvider = () => (
  <div className="min-h-screen flex items-center justify-center" dir="rtl">
    <div className="text-center">
      <div className="text-4xl mb-4">🔧</div>
      <p className="text-gray-500">טוען טופס הרשמה לנותן שירות...</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/tenant" element={<RegisterTenant />} />
      <Route path="/register/manager" element={<RegisterManager />} />
      <Route path="/register/provider" element={<RegisterProvider />} />

      {/* Tenant */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/profile" element={<Profile />} />

      {/* Committee */}
      <Route path="/committee/*" element={<CommitteeDashboard />} />

      {/* Manager */}
      <Route path="/manager/*" element={<ManagerDashboard />} />

      {/* Service Provider */}
      <Route path="/provider/*" element={<ProviderDashboard />} />
    </Routes>
  )
}
