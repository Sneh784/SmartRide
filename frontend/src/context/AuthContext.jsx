import { createContext, useContext, useMemo, useState } from 'react';

const getStoredUser = () => {
  try {
    const savedUser = localStorage.getItem('smartRideUser');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => localStorage.getItem('smartRideToken') || '');

  const setUser = (nextUser) => {
    setUserState(nextUser);
    if (nextUser) {
      localStorage.setItem('smartRideUser', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('smartRideUser');
    }
  };

  const login = ({ authToken, userData }) => {
    setToken(authToken);
    localStorage.setItem('smartRideToken', authToken);
    setUser(userData);
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('smartRideToken');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      setUser,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
