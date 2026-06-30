import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layouts/AdminLayout'
import AdminHomePage from './pages/admin/AdminHomePage'
import BetaStartPage from './pages/admin/BetaStartPage'
import MembersPage from './pages/admin/MembersPage'
import { MemberAttendanceTab } from './components/member-detail/MemberAttendanceTab'
import { MemberDetailShell } from './components/member-detail/MemberDetailShell'
import { MemberJournalTab } from './components/member-detail/MemberJournalTab'
import { MemberInbodyTab } from './components/member-detail/MemberInbodyTab'
import { MemberOverviewTab } from './components/member-detail/MemberOverviewTab'
import { MemberPtPaymentTab } from './components/member-detail/MemberPtPaymentTab'
import { MemberRecordsTab } from './components/member-detail/MemberRecordsTab'
import MemberDetailLegacyRedirect from './pages/admin/MemberDetailLegacyRedirect'
import MemberAdminDetailRedirect from './pages/admin/MemberAdminDetailRedirect'
import SchedulePage from './pages/admin/SchedulePage'
import AttendancePage from './pages/admin/AttendancePage'
import TrainersPage from './pages/admin/TrainersPage'
import SeasonPassPage from './pages/admin/SeasonPassPage'
import ChallengesPage from './pages/admin/ChallengesPage'
import MotionHubAdminPage from './pages/admin/MotionHubAdminPage'
import RewardsPageRedirect from './pages/admin/RewardsPageRedirect'
import MessagesPage from './pages/admin/MessagesPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import CenterSettingsPage from './pages/admin/CenterSettingsPage'
import BusinessAnalyticsPage from './pages/admin/BusinessAnalyticsPage'
import ClassesPage from './pages/admin/ClassesPage'
import FacilityOpsPage from './pages/admin/FacilityOpsPage'
import LeadsPage from './pages/admin/LeadsPage'
import MemberPortalPage from './pages/MemberPortalPage'
import MemberWelcomePage from './pages/MemberWelcomePage'
import { RootPage } from './pages/RootPage'
import LoginPage from './pages/LoginPage'
import CenterSignupPage from './pages/CenterSignupPage'
import MotionHubLandingPage from './pages/MotionHubLandingPage'
import GuidePage from './pages/GuidePage'
import PlatformLoginPage from './pages/platform/PlatformLoginPage'
import PlatformDashboardPage from './pages/platform/PlatformDashboardPage'
import PlatformCentersPage from './pages/platform/PlatformCentersPage'
import PlatformCenterDetailPage from './pages/platform/PlatformCenterDetailPage'
import PlatformCreateCenterPage from './pages/platform/PlatformCreateCenterPage'
import PlatformConsentsPage from './pages/platform/PlatformConsentsPage'
import PlatformBetaApplicationsPage from './pages/platform/PlatformBetaApplicationsPage'
import PlatformFeedbackPage from './pages/platform/PlatformFeedbackPage'
import PlatformAnalyticsPage from './pages/platform/PlatformAnalyticsPage'
import PlatformBetaOpsPage from './pages/platform/PlatformBetaOpsPage'
import { PlatformAccessGuard } from './components/PlatformAccessGuard'
import { PlatformLayout } from './components/layouts/PlatformLayout'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/motionhub" element={<MotionHubLandingPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CenterSignupPage />} />
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route path="/platform" element={<PlatformAccessGuard />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<PlatformDashboardPage />} />
            <Route path="centers" element={<PlatformCentersPage />} />
            <Route path="centers/:centerId" element={<PlatformCenterDetailPage />} />
            <Route path="centers/new" element={<PlatformCreateCenterPage />} />
            <Route path="feedback" element={<PlatformFeedbackPage />} />
            <Route path="analytics" element={<PlatformAnalyticsPage />} />
            <Route path="beta" element={<PlatformBetaOpsPage />} />
            <Route path="consents" element={<PlatformConsentsPage />} />
            <Route path="beta-applications" element={<PlatformBetaApplicationsPage />} />
          </Route>
        </Route>
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="beta-start" element={<BetaStartPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="member/:memberId" element={<MemberDetailShell />}>
              <Route index element={<MemberOverviewTab />} />
              <Route path="pt" element={<MemberPtPaymentTab />} />
              <Route path="attendance" element={<MemberAttendanceTab />} />
              <Route path="records" element={<MemberRecordsTab />} />
              <Route path="inbody" element={<MemberInbodyTab />} />
              <Route path="journal" element={<MemberJournalTab />} />
            </Route>
            <Route
              path="members/:memberId"
              element={<MemberDetailLegacyRedirect />}
            />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="motionhub" element={<MotionHubAdminPage />} />
            <Route path="rewards" element={<RewardsPageRedirect />} />
            <Route path="challenges" element={<ChallengesPage />} />
            <Route path="season-pass" element={<SeasonPassPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="analytics" element={<BusinessAnalyticsPage />} />
            <Route path="settings" element={<CenterSettingsPage />} />
            <Route path="facility" element={<FacilityOpsPage />} />
          </Route>
        </Route>
        <Route path="/member/:memberId" element={<MemberAdminDetailRedirect />} />
        <Route path="/member/welcome" element={<MemberWelcomePage />} />
        <Route path="/member" element={<MemberPortalPage />} />
        <Route path="/trainer" element={<Navigate to="/admin" replace />} />
        <Route path="/user" element={<Navigate to="/member" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}