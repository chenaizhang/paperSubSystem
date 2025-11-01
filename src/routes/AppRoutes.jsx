import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import NotificationsPage from '../pages/NotificationsPage.jsx';
import AuthorDashboardPage from '../pages/author/AuthorDashboardPage.jsx';
import AuthorPapersListPage from '../pages/author/AuthorPapersListPage.jsx';
import AuthorPaperFormPage from '../pages/author/AuthorPaperFormPage.jsx';
import AuthorPaperDetailPage from '../pages/author/AuthorPaperDetailPage.jsx';
import ExpertDashboardPage from '../pages/expert/ExpertDashboardPage.jsx';
import ExpertReviewsListPage from '../pages/expert/ExpertReviewsListPage.jsx';
import ExpertReviewDetailPage from '../pages/expert/ExpertReviewDetailPage.jsx';
import ExpertWithdrawalsPage from '../pages/expert/ExpertWithdrawalsPage.jsx';
import EditorDashboardPage from '../pages/editor/EditorDashboardPage.jsx';
import EditorPapersListPage from '../pages/editor/EditorPapersListPage.jsx';
import EditorPaperDetailPage from '../pages/editor/EditorPaperDetailPage.jsx';
import EditorPaymentsPage from '../pages/editor/EditorPaymentsPage.jsx';
import EditorSchedulesPage from '../pages/editor/EditorSchedulesPage.jsx';
import { ForbiddenPage } from '../pages/status/ForbiddenPage.jsx';
import { NotFoundPage } from '../pages/status/NotFoundPage.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

function ProtectedAppShell() {
  const { role } = useAuth();
  return (
    <ProtectedRoute roles={role ? [role] : undefined}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedAppShell />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<ProtectedRoute roles={["author"]}><NotificationsPage /></ProtectedRoute>} />

        <Route
          path="/author/dashboard"
          element={
            <ProtectedRoute roles={['author']}>
              <AuthorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/papers"
          element={
            <ProtectedRoute roles={['author']}>
              <AuthorPapersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/papers/new"
          element={
            <ProtectedRoute roles={['author']}>
              <AuthorPaperFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/papers/:paperId"
          element={
            <ProtectedRoute roles={['author']}>
              <AuthorPaperDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/papers/:paperId/edit"
          element={
            <ProtectedRoute roles={['author']}>
              <AuthorPaperFormPage mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expert/dashboard"
          element={
            <ProtectedRoute roles={['expert']}>
              <ExpertDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expert/reviews"
          element={
            <ProtectedRoute roles={['expert']}>
              <ExpertReviewsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expert/reviews/:assignmentId"
          element={
            <ProtectedRoute roles={['expert']}>
              <ExpertReviewDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expert/withdrawals"
          element={
            <ProtectedRoute roles={['expert']}>
              <ExpertWithdrawalsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor/dashboard"
          element={
            <ProtectedRoute roles={['editor']}>
              <EditorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/papers"
          element={
            <ProtectedRoute roles={['editor']}>
              <EditorPapersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/papers/:paperId"
          element={
            <ProtectedRoute roles={['editor']}>
              <EditorPaperDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/payments"
          element={
            <ProtectedRoute roles={['editor']}>
              <EditorPaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/schedules"
          element={
            <ProtectedRoute roles={['editor']}>
              <EditorSchedulesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
