import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import LoadingScreen from './components/LoadingScreen'
import VotesTracker from './pages/VotesTracker'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterTenant from './pages/RegisterTenant'
import RegisterManager from './pages/RegisterManager'
import RegisterProvider from './pages/RegisterProvider'
import TenantOnboarding from './pages/TenantOnboarding'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Profile from './pages/Profile'
import CommitteeDashboard from './pages/CommitteeDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import ProviderDashboard from './pages/ProviderDashboard'
import Directory from './pages/Directory'
import ChatPage from './pages/ChatPage'
import QuotesPage from './pages/QuotesPage'
import BuildingChatPage from './pages/BuildingChatPage'
import FaqBot from './components/FaqBot/FaqBot'
import AccessibilityWidget from './components/Accessibility/AccessibilityWidget'
import OAuthRoleSelect from './pages/OAuthRoleSelect'
import InspectionsPage from './pages/InspectionsPage'
import NewInspectionPage from './pages/NewInspectionPage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import JoinProject from './pages/JoinProject'
import CommitteeActions from './pages/CommitteeActions'
import PowerOfAttorneyForm from './pages/PowerOfAttorneyForm'
import UnlocatedTenantForm from './pages/UnlocatedTenantForm'
import OwnershipDisputeForm from './pages/OwnershipDisputeForm'
import TenantReportForm from './pages/TenantReportForm'
import ElderlyForm from './pages/ElderlyForm'
import TimelinePage from './pages/TimelinePage'

function OAuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const token = params.get('access_token')
      const refresh = params.get('refresh_token')
      if (token) {
        localStorage.setItem('sb-token', token)
        if (refresh) localStorage.setItem('sb-refresh-token', refresh)
        setTimeout(() => navigate('/oauth-role', { replace: true }), 50)
      }
    }
  }, [navigate])
  return null
}

export default function App() {
  const [showLoader, setShowLoader] = useState(true)

  return (
    <>
      {showLoader && <LoadingScreen onDone={() => setShowLoader(false)} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/tenant" element={<RegisterTenant />} />
        <Route path="/register/manager" element={<RegisterManager />} />
        <Route path="/register/provider" element={<RegisterProvider />} />
        <Route path="/onboarding" element={<TenantOnboarding />} />
        <Route path="/dashboard" element={<><OAuthCallback /><Dashboard /></>} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/committee/*" element={<CommitteeDashboard />} />
        <Route path="/manager/*" element={<ManagerDashboard />} />
        <Route path="/provider/*" element={<ProviderDashboard />} />
        <Route path="/inspections" element={<InspectionsPage />} />
        <Route path="/inspections/:projectId/new/:inspectionType" element={<NewInspectionPage />} />
        <Route path="/oauth-role" element={<OAuthRoleSelect />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/quotes" element={<QuotesPage />} />
        <Route path="/organizer/*" element={<OrganizerDashboard />} />
        <Route path="/join/:code" element={<JoinProject />} />
        <Route path="/building-chat/:groupId" element={<BuildingChatPage />} />
        <Route path="/committee-actions" element={<CommitteeActions />} />
        <Route path="/votes-tracker" element={<VotesTracker />} />
        <Route path="/power-of-attorney" element={<PowerOfAttorneyForm />} />
        <Route path="/unlocated-tenant" element={<UnlocatedTenantForm />} />
        <Route path="/ownership-dispute" element={<OwnershipDisputeForm />} />
        <Route path="/tenant-report" element={<TenantReportForm />} />
        <Route path="/elderly-form" element={<ElderlyForm />} />
        <Route path="/timeline" element={<TimelinePage />} />
      </Routes>
      <FaqBot />
      <AccessibilityWidget />
    </>
  )
}
