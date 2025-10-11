import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes.jsx';
import { useAuth } from './features/auth/AuthProvider.jsx';
import { Center, Loader } from '@mantine/core';

function AppLoader() {
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  );
}

export default function App() {
  const { isLoading, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [token, location.pathname, navigate]);

  if (isLoading) {
    return <AppLoader />;
  }

  return <AppRoutes />;
}
