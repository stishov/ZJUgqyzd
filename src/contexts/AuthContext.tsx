import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;
type AppRole = 'admin' | 'moderator' | 'user';

// 管理员账号配置
const ADMIN_CONFIG = {
  username: 'gqyzd',
  password: 'ZJUgqyzd1997',
  displayName: '管理员',
};

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

  // 应用启动时自动初始化管理员账号
  useEffect(() => {
    initializeAdminAccount();
  }, []);

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

  // 初始化管理员账号 - 使用 signUp + RPC 确认邮箱
  async function initializeAdminAccount() {
    try {
      console.log('Checking admin account...');

      // 检查管理员是否已存在
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', ADMIN_CONFIG.username)
        .maybeSingle();

      if (!existingUser) {
        console.log('Admin not found, creating via signUp...');

        // 使用 signUp 创建账号（确保密码哈希正确）
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${ADMIN_CONFIG.username}@meoo.local`,
          password: ADMIN_CONFIG.password,
          options: {
            data: {
              username: ADMIN_CONFIG.username,
              email: `${ADMIN_CONFIG.username}@meoo.local`,
            },
          },
        });

        if (signUpError) {
          console.error('Failed to create admin via signUp:', signUpError);
          return;
        }

        console.log('signUp successful, waiting for profile creation...');
        // 等待用户和 profile 创建完成
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 获取新创建的用户ID
        const { data: newUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', ADMIN_CONFIG.username)
          .maybeSingle();

        if (newUser) {
          console.log('Found new admin user ID:', newUser.id);

          // 通过 RPC 函数确认邮箱并赋予角色
          const { error: rpcError } = await supabase.rpc('confirm_admin_user', {
            p_user_id: newUser.id,
            p_display_name: ADMIN_CONFIG.displayName,
          });

          if (rpcError) {
            console.error('Failed to confirm admin via RPC:', rpcError);
            // 降级：直接 SQL 更新
            console.log('Trying fallback: direct SQL update...');
            await supabase.from('user_roles').insert({ user_id: newUser.id, role: 'admin' });
            await supabase.from('profiles').update({ display_name: ADMIN_CONFIG.displayName }).eq('id', newUser.id);
          } else {
            console.log('✅ Admin account confirmed and role assigned successfully');
          }
        } else {
          console.error('Could not find newly created admin user in profiles table');
        }
      } else {
        console.log('Admin account already exists, verifying email confirmation...');
        // 如果账号已存在，确保邮箱已确认
        const { data: authUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', ADMIN_CONFIG.username)
          .maybeSingle();

        if (authUser) {
          // 再次调用 RPC 确保邮箱确认（幂等操作）
          const { error } = await supabase.rpc('confirm_admin_user', {
            p_user_id: authUser.id,
            p_display_name: ADMIN_CONFIG.displayName,
          });

          if (error) {
            console.warn('Could not re-confirm admin email:', error.message);
          } else {
            console.log('✅ Admin email confirmation verified');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error initializing admin account:', error);
    }
  }

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

  async function signIn(username: string, password: string) {
    const email = `${username}@meoo.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      await loadUserData(data.user.id);
    }

    // 返回更详细的错误信息
    return {
      error,
      errorCode: error?.message?.includes('Invalid login credentials') ? 'invalid_credentials' : undefined,
      username
    };
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
