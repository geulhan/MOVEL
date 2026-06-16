import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layouts/AdminLayout'
import AdminHomePage from './pages/admin/AdminHomePage'
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
import RewardsPage from './pages/admin/RewardsPage'
import MessagesPage from './pages/admin/MessagesPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import CenterSettingsPage from './pages/admin/CenterSettingsPage'
import BusinessAnalyticsPage from './pages/admin/BusinessAnalyticsPage'
import MemberPortalPage from './pages/MemberPortalPage'
import { RootPage } from './pages/RootPage'
import LoginPage from './pages/LoginPage'
import CenterSignupPage from './pages/CenterSignupPage'
import MotionHubLandingPage from './pages/MotionHubLandingPage'
import PlatformLoginPage from './pages/platform/PlatformLoginPage'
import PlatformHomePage from './pages/platform/PlatformHomePage'
import PlatformCreateCenterPage from './pages/platform/PlatformCreateCenterPage'
import PlatformConsentsPage from './pages/platform/PlatformConsentsPage'
import { PlatformAccessGuard } from './components/PlatformAccessGuard'
import { PlatformLayout } from './components/layouts/PlatformLayout'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/motionhub" element={<MotionHubLandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CenterSignupPage />} />
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route path="/platform" element={<PlatformAccessGuard />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<PlatformHomePage />} />
            <Route path="consents" element={<PlatformConsentsPage />} />
            <Route path="centers/new" element={<PlatformCreateCenterPage />} />
          </Route>
        </Route>
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="members" element={<MembersPage />} />
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
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="analytics" element={<BusinessAnalyticsPage />} />
            <Route path="settings" element={<CenterSettingsPage />} />
            <Route
              path="facility"
              element={<Navigate to="/admin/payments?category=center_pass" replace />}
            />
          </Route>
        </Route>
        <Route path="/member/:memberId" element={<MemberAdminDetailRedirect />} />
        <Route path="/member" element={<MemberPortalPage />} />
        <Route path="/trainer" element={<Navigate to="/admin" replace />} />
        <Route path="/user" element={<Navigate to="/member" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
