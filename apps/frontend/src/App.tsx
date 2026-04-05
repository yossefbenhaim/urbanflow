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
import ValidationPage from './pages/ValidationPage'
import LearningPage from './pages/LearningPage'
import DocumentViewPage from './pages/DocumentViewPage'

function OAuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    let token: string | null = null
    let refresh: string | null = null

    // Check hash fragment (implicit flow)
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      token = params.get('access_token')
      refresh = params.get('refresh_token')
    }
    // Check query params (PKCE flow)
    if (!token && search.includes('access_token')) {
      const params = new URLSearchParams(search)
      token = params.get('access_token')
      refresh = params.get('refresh_token')
    }

    if (token) {
      localStorage.setItem('sb-token', token)
      if (refresh) localStorage.setItem('sb-refresh-token', refresh)
      navigate('/oauth-role', { replace: true })
    } else {
      // No token found - redirect to login
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f8f9fa] font-heebo">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#3b6b9c] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[#5a5a6e] text-lg">מתחבר עם Google...</p>
      </div>
    </div>
  )
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
        <Route path="/documents/:docId" element={<DocumentViewPage />} />
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
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/learn" element={<LearningPage />} />
      </Routes>
      <FaqBot />
      <AccessibilityWidget />
    </>
  )
}
