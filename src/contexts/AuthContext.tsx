/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: 'owner' | 'customer') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
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

    const { data, error } = await supabase.auth.signUp({
      email: emailTrim,
      password: passwordTrim,
    });

    if (error) {
      // Throw the original Supabase error object so UI can inspect full details
      throw { message: error.message, details: error };
    }
    if (!data.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      role,
      full_name: fullName,
      phone,
    });

    if (profileError) {
      throw { message: profileError.message, details: profileError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password: passwordTrim,
    });

    if (error) throw { message: error.message, details: error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const updateAuth = async (updates: { email?: string; password?: string }) => {
    if (!user) throw new Error('No user logged in');

    const res = await supabase.auth.updateUser({
      email: updates.email,
      password: updates.password,
    });

    if (res.error) throw res.error;

    // refresh session user if possible
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      setUser(sessionData.session?.user ?? user);
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
