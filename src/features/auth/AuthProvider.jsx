import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import {
  clearAuthSession,
  setAuthSession
} from '../../stores/authStorage.js';

const AuthContext = createContext({
  isAuthenticated: false,
  role: null,
  userId: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
  profile: null
});

const STORAGE_KEY = 'paperapp-auth-state';
const normalizeRole = (value) => (value ? String(value).toLowerCase() : null);

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const normalizedRole = normalizeRole(parsed.role);
        const restored = { ...parsed, role: normalizedRole };
        setAuthSession(restored);
        return { ...restored, isAuthenticated: Boolean(restored.token) };
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    return {
      token: null,
      role: null,
      userId: null,
      profile: null,
      isAuthenticated: false
    };
  });
  const [isLoading, setIsLoading] = useState(Boolean(state.token));

  useEffect(() => {
    if (state.token) {
      setAuthSession(state);
    } else {
      clearAuthSession();
    }
  }, [state]);

  useEffect(() => {
    let ignore = false;
    async function verifyToken() {
      try {
        const { data } = await api.get(endpoints.auth.check);
        if (!ignore) {
          setState((prev) => ({
            ...prev,
            isAuthenticated: true,
            role: data?.user?.role ? normalizeRole(data.user.role) : prev.role,
            userId: data?.user?.id ?? prev.userId
          }));
        }
      } catch {
        if (!ignore) {
          handleLogout();
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    if (state.token) {
      verifyToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: state.token,
        role: state.role,
        userId: state.userId,
        profile: state.profile
      })
    );
  }, [state]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      token: null,
      role: null,
      userId: null,
      profile: null,
      isAuthenticated: false
    });
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post(endpoints.auth.login, payload);
    const normalizedRole = normalizeRole(data.role || payload.role);
    const nextState = {
      token: data.token,
      role: normalizedRole,
      userId: data.userId || data.id,
      profile: null,
      isAuthenticated: true
    };
    setAuthSession(nextState);
    setState(nextState);
    return nextState;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get(endpoints.users.profile);
    setState((prev) => ({
      ...prev,
      profile: data
    }));
    return data;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
      login,
      logout: handleLogout,
      refreshProfile
    }),
    [state, isLoading, login, handleLogout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  return useContext(AuthContext);
}
