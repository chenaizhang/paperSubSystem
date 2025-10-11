import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils.jsx';
import { ProtectedRoute } from '../src/routes/ProtectedRoute.jsx';

let authState = {
  isAuthenticated: false,
  role: null
};

vi.mock('../src/features/auth/AuthProvider.jsx', () => ({
  useAuth: () => authState
}));

describe('ProtectedRoute', () => {
  it('redirects to login when unauthenticated', () => {
    authState = { isAuthenticated: false, role: null };

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/secure"
          element={
            <ProtectedRoute roles={['author']}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/secure'] }
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders forbidden page when role mismatch', () => {
    authState = { isAuthenticated: true, role: 'expert' };

    renderWithProviders(
      <Routes>
        <Route
          path="/secure"
          element={
            <ProtectedRoute roles={['author']}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/secure'] }
    );

    expect(screen.getByText(/403/)).toBeInTheDocument();
  });

  it('renders children when authorized', () => {
    authState = { isAuthenticated: true, role: 'author' };

    renderWithProviders(
      <Routes>
        <Route
          path="/secure"
          element={
            <ProtectedRoute roles={['author']}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/secure'] }
    );

    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
