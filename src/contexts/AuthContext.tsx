import React, { createContext, useContext, useEffect, useMemo, useState, useRef, ReactNode } from "react";
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
  const initialLoadComplete = useRef(false);



  // Inicialização sem flash de null
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
        initialLoadComplete.current = true;
      }
    }).catch((err) => {
      setIsLoading(false);
      initialLoadComplete.current = true;
    });
    return () => { mounted = false; };
  }, []);

  // Atualização reativa, mas só se o user.id realmente mudar
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Nunca faça reload automático!
      // Se erro de WebSocket/network/Realtime, ignora alteração de estado
      if (
        (newSession === null && navigator.onLine === false) ||
        (typeof window !== 'undefined' && window?.lastRealtimeError)
      ) return;
      setSession(prev => {
        if (prev?.user?.id === newSession?.user?.id) return prev;
        setUser(newSession?.user ?? null);
        // Nunca volte a exibir loading após o primeiro carregamento
        if (!initialLoadComplete.current) setIsLoading(true);
        else setIsLoading(false);
        return newSession;
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Memoize o contexto para evitar renders desnecessários
  const value = useMemo(() => ({
    session,
    user,
    isLoading: initialLoadComplete.current ? false : isLoading,
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
