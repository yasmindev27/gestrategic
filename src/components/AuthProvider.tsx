import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicialização sem flash de null
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Atualização reativa, mas só se o user.id realmente mudar
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(prev => {
        if (prev?.user?.id === newSession?.user?.id) return prev;
        setUser(newSession?.user ?? null);
        return newSession;
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Memoize o contexto para evitar renders desnecessários
  const value = useMemo(() => ({
    session,
    user,
    isLoading,
  }), [session, user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
