import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layouts/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import MembersPage from './pages/admin/MembersPage'
import { MemberAttendanceTab } from './components/member-detail/MemberAttendanceTab'
import { MemberDetailShell } from './components/member-detail/MemberDetailShell'
import { MemberJournalTab } from './components/member-detail/MemberJournalTab'
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
import MemberPortalPage from './pages/MemberPortalPage'
import TrainerPortalPage from './pages/TrainerPortalPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="member/:memberId" element={<MemberDetailShell />}>
              <Route index element={<MemberOverviewTab />} />
              <Route path="pt" element={<MemberPtPaymentTab />} />
              <Route path="attendance" element={<MemberAttendanceTab />} />
              <Route path="records" element={<MemberRecordsTab />} />
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
          </Route>
        </Route>
        <Route path="/member/:memberId" element={<MemberAdminDetailRedirect />} />
        <Route path="/member" element={<MemberPortalPage />} />
        <Route path="/trainer" element={<TrainerPortalPage />} />
        <Route path="/user" element={<Navigate to="/member" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
