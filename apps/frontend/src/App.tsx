import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './pages/NotFoundPage'
import VotesTracker from './pages/VotesTracker'
import { supabase } from './lib/supabase'
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
import JoinProjectPage from './pages/JoinProjectPage'
import CommitteeActions from './pages/CommitteeActions'
import PowerOfAttorneyForm from './pages/PowerOfAttorneyForm'
import UnlocatedTenantForm from './pages/UnlocatedTenantForm'
import OwnershipDisputeForm from './pages/OwnershipDisputeForm'
import TenantReportForm from './pages/TenantReportForm'
import ElderlyForm from './pages/ElderlyForm'
import ApartmentWishesForm from './pages/ApartmentWishesForm'
import TabuUploadPage from './pages/TabuUploadPage'

import ProjectProgressPage from './pages/ProjectProgressPage'
import TimelinePage from './pages/TimelinePage'
import ValidationPage from './pages/ValidationPage'
import LearningPage from './pages/LearningPage'
import DocumentViewPage from './pages/DocumentViewPage'
import DeveloperForms from './pages/DeveloperForms'
import MatchPreferences from './pages/MatchPreferences'
import ProviderOnboarding from './pages/ProviderOnboarding'
import ProviderPublicProfile from './pages/ProviderPublicProfile'
import TendersPage from './pages/TendersPage'
import TenderDetailPage from './pages/TenderDetailPage'
import NegotiationsPage from './pages/NegotiationsPage'
import NegotiationDetailPage from './pages/NegotiationDetailPage'
import BuildingTasksPage from './pages/BuildingTasksPage'
import MeetingsPage from './pages/MeetingsPage'

function OAuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    let done = false

    function saveAndRedirect(session: { access_token: string; refresh_token?: string | null }) {
      if (done) return
      done = true
      localStorage.setItem('sb-token', session.access_token)
      if (session.refresh_token) localStorage.setItem('sb-refresh-token', session.refresh_token)
      navigate('/oauth-role', { replace: true })
    }

    // Listen for Supabase to auto-detect the auth params in URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        saveAndRedirect(session)
      }
    })

    // Also try manually: exchange code or check existing session
    async function tryManual() {
      // Wait a moment for Supabase auto-detection
      await new Promise(r => setTimeout(r, 1000))
      if (done) return

      const search = window.location.search
      const hash = window.location.hash

      // Try PKCE code exchange
      if (search.includes('code=')) {
        const code = new URLSearchParams(search).get('code')
        if (code) {
          const { data } = await supabase.auth.exchangeCodeForSession(code)
          if (data?.session) { saveAndRedirect(data.session); return }
        }
      }

      // Try hash fragment (implicit flow)
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const token = params.get('access_token')
        const refresh = params.get('refresh_token')
        if (token) { saveAndRedirect({ access_token: token, refresh_token: refresh }); return }
      }

      // Try existing session
      const { data } = await supabase.auth.getSession()
      if (data?.session) { saveAndRedirect(data.session); return }

      // Last resort: wait more and try again
      await new Promise(r => setTimeout(r, 2000))
      if (done) return
      const { data: retry } = await supabase.auth.getSession()
      if (retry?.session) { saveAndRedirect(retry.session); return }

      // Give up
      if (!done) navigate('/login', { replace: true })
    }
    tryManual()

    return () => { subscription.unsubscribe() }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#3b6b9c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#5a5a6e] font-heebo">מתחבר...</p>
      </div>
    </div>
  )
}

export default function App() {
  const [showLoader, setShowLoader] = useState(() => {
    if (sessionStorage.getItem('uf-loaded')) return false
    sessionStorage.setItem('uf-loaded', '1')
    return true
  })

  return (
    <ErrorBoundary>
      {showLoader && <LoadingScreen onDone={() => setShowLoader(false)} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/tenant" element={<RegisterTenant />} />
        <Route path="/register/manager" element={<RegisterManager />} />
        <Route path="/register/provider" element={<RegisterProvider />} />
        <Route path="/onboarding" element={<TenantOnboarding />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/:docId" element={<DocumentViewPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/committee/*" element={<CommitteeDashboard />} />
        <Route path="/manager/*" element={<ManagerDashboard />} />
        <Route path="/provider/*" element={<ProviderDashboard />} />
        <Route path="/inspections" element={<InspectionsPage />} />
        <Route path="/inspections/:projectId/new/:inspectionType" element={<NewInspectionPage />} />
        <Route path="/developer/forms" element={<DeveloperForms />} />
        <Route path="/provider/preferences" element={<MatchPreferences />} />
        <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
        <Route path="/providers/:userId" element={<ProviderPublicProfile />} />
        <Route path="/tenders" element={<TendersPage />} />
        <Route path="/tenders/:tenderId" element={<TenderDetailPage />} />
        <Route path="/negotiations" element={<NegotiationsPage />} />
        <Route path="/negotiations/:negotiationId" element={<NegotiationDetailPage />} />
        <Route path="/my-tasks" element={<BuildingTasksPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/oauth-role" element={<OAuthRoleSelect />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/quotes" element={<QuotesPage />} />
        <Route path="/organizer/*" element={<OrganizerDashboard />} />
        <Route path="/join/:code" element={<JoinProject />} />
        <Route path="/join-project" element={<JoinProjectPage />} />
        <Route path="/building-chat/:groupId" element={<BuildingChatPage />} />
        <Route path="/committee-actions" element={<CommitteeActions />} />
        <Route path="/votes-tracker" element={<VotesTracker />} />
        <Route path="/power-of-attorney" element={<PowerOfAttorneyForm />} />
        <Route path="/unlocated-tenant" element={<UnlocatedTenantForm />} />
        <Route path="/ownership-dispute" element={<OwnershipDisputeForm />} />
        <Route path="/tenant-report" element={<TenantReportForm />} />
        <Route path="/elderly-form" element={<ElderlyForm />} />
        <Route path="/apartment-wishes" element={<ApartmentWishesForm />} />
        <Route path="/upload-tabu" element={<TabuUploadPage />} />

        <Route path="/project-progress" element={<ProjectProgressPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/learn" element={<LearningPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FaqBot />
      <AccessibilityWidget />
      <Toaster
        position="top-center"
        dir="rtl"
        toastOptions={{
          style: { fontFamily: 'inherit' },
          duration: 4000,
        }}
      />
    </ErrorBoundary>
  )
}
