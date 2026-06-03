import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;
type AppRole = 'admin' | 'moderator' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  guestLogin: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('admin') || roles.includes('moderator');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadUserData(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    setIsLoading(true);
    try {
      await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return;
    }
    
    setProfile(data);
  }

  async function fetchRoles(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
      return;
    }
    
    if (data && data.length > 0) {
      setRoles(data.map(r => r.role as AppRole));
    } else {
      setRoles([]);
    }
  }

  async function refreshProfile() {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${email}@meoo.local`,
      password,
    });
    
    if (!error && data.user) {
      await loadUserData(data.user.id);
    }
    
    return { error };
  }

  async function signUp(username: string, email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email: `${username}@meoo.local`,
      password,
      options: {
        data: { username, email },
      },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsGuest(false);
    setProfile(null);
    setRoles([]);
  }

  function guestLogin() {
    setIsGuest(true);
    setProfile(null);
    setRoles([]);
  }

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      roles,
      isLoading,
      isAdmin,
      isModerator,
      isGuest,
      signIn,
      signUp,
      signOut,
      guestLogin,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}