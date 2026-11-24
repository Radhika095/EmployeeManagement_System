import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ems_user"));
    } catch {
      return null;
    }
  });

  const signIn = ({ token, user }) => {
    localStorage.setItem("ems_token", token);
    localStorage.setItem("ems_user", JSON.stringify(user));
    setUser(user);
  };

  const signOut = () => {
    localStorage.removeItem("ems_token");
    localStorage.removeItem("ems_user");
    setUser(null);
  };

  // Merge changes (e.g. a new display name) into the stored session.
  const updateUser = (changes) => {
    setUser((prev) => {
      const next = { ...prev, ...changes };
      localStorage.setItem("ems_user", JSON.stringify(next));
      return next;
    });
  };

  return <AuthContext.Provider value={{ user, signIn, signOut, updateUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
