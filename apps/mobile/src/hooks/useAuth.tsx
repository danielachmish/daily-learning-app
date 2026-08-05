import type { GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '../services/supabase';

export interface SignUpInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  genderTrack: GenderTrack;
  language: Language;
}

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  /** True while the initial session/profile is being loaded on app start. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, phone, email, role, gender_track, language, account_status, free_access, current_streak, best_streak, total_completed_days, created_at, updated_at, last_login_at'
    )
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session);
      if (data.session) {
        const loadedProfile = await fetchProfile(data.session.user.id);
        if (isMounted) setProfile(loadedProfile);
      }
      setLoading(false);
    }

    loadInitialSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id).then((loadedProfile) => {
          if (isMounted) setProfile(loadedProfile);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(input: SignUpInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Sign up did not return a user.' };
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      gender_track: input.genderTrack,
      language: input.language,
    });

    if (profileError) {
      return { error: profileError.message };
    }

    const loadedProfile = await fetchProfile(data.user.id);
    setProfile(loadedProfile);

    return { error: null };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
