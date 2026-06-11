import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layouts/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import MembersPage from './pages/admin/MembersPage'
import MemberDetailRoute from './pages/admin/MemberDetailRoute'
import MemberDetailLegacyRedirect from './pages/admin/MemberDetailLegacyRedirect'
import MemberAdminDetailRedirect from './pages/admin/MemberAdminDetailRedirect'
import SchedulePage from './pages/admin/SchedulePage'
import AttendancePage from './pages/admin/AttendancePage'
import TrainersPage from './pages/admin/TrainersPage'
import RewardsPage from './pages/admin/RewardsPage'
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
            <Route path="member/:memberId" element={<MemberDetailRoute />} />
            <Route
              path="members/:memberId"
              element={<MemberDetailLegacyRedirect />}
            />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="rewards" element={<RewardsPage />} />
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
