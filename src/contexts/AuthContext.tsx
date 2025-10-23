/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../lib/supabase';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: 'owner' | 'customer') => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateAuth: (updates: { email?: string; password?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try fast-path: read current session (may be null while Firebase restores state)
    supabase.auth.getSession().then((res) => {
      try {
        const session = res?.data?.session ?? null;
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
      } catch {
        // ignore
      }
    }).catch(() => {});

    // Listen for auth state changes. We only set `loading` to false after the
    // first auth state event, which ensures refresh/restore is handled.
    let firstEvent = true;
    const resp = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      if (firstEvent) {
        setLoading(false);
        firstEvent = false;
      }
    });

    const unsubscribe = resp?.data?.subscription?.unsubscribe || (() => {});
    return () => unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const result = await supabase
        .from<Profile>('profiles')
        .select()
        .eq('id', userId)
        .single();

      if (result.error) {
        console.error('Error loading profile:', result.error);
        return;
      }

      if (result.data) {
        setProfile(result.data);
      } else {
        console.error('No profile found for user:', userId);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: 'owner' | 'customer'
  ) => {
    const emailTrim = email.trim();
    const passwordTrim = password.trim();

  if (!emailTrim) throw new Error('Email is required for sign up');
  const { data, error } = await supabase.auth.signUp({ email: emailTrim, password: passwordTrim });

    if (error || !data?.user) {
      throw new Error(error ? String(error) : 'User creation failed');
    }

    const insertRes = await supabase
      .from<Profile>('profiles')
      .insert({
        id: data.user.id,
        role,
        full_name: fullName,
        phone,
        email: emailTrim || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertRes.error) {
      throw new Error(String(insertRes.error));
    }
  };

  // signIn accepts either an email or a phone number in the `identifier` param.
  const signIn = async (identifier: string, password: string) => {
    const idTrim = identifier.trim();
    const passwordTrim = password.trim();

    // If the identifier looks like an email, sign in directly
    const emailLike = idTrim.includes('@');
    if (emailLike) {
      const { error } = await supabase.auth.signInWithPassword({ email: idTrim, password: passwordTrim });
      if (error) throw new Error(String(error));
      return;
    }

    // Otherwise, treat as phone number: lookup profile by phone to get the linked email
    try {
      const { data, error } = await supabase.from<Profile>('profiles').select('id,email').eq('phone', idTrim).maybeSingle();
      if (error) throw error;
      if (!data || !data.email) {
        throw new Error('No account found for this phone number');
      }
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: data.email, password: passwordTrim });
      if (authErr) throw authErr;
    } catch (err) {
      throw new Error(String(err));
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(String(error));
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const updated = {
        ...updates,
        updated_at: new Date().toISOString()
      } as Partial<Profile>;

      const res = await supabase.from<Profile>('profiles').update(updated).eq('id', user.id).get();
      if (res.error) {
        console.error('Profile update error:', res.error);
        throw new Error(String(res.error));
      }

      // merge into local state
      setProfile((prev) => (prev ? { ...prev, ...updates, updated_at: updated.updated_at! } as Profile : prev));
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error(String(error));
    }
  };

  const updateAuth = async (updates: { email?: string; password?: string }) => {
    if (!user) throw new Error('No user logged in');

    const res = await supabase.auth.updateUser(updates);

    if (res.error) throw new Error(String(res.error));

    // refresh session user if possible
    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.data?.session?.user) {
        setUser(sessionResult.data.session.user);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        updateAuth,
      }}
    >
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
