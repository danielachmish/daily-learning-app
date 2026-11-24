import type { GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { describeError, logEvent } from '../services/eventLog';
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
  /**
   * Sets the user's own gender track and marks it confirmed — used both by
   * the first-entry picker (bulk-imported subscribers, track_confirmed =
   * false) and by the "change track" link on the daily lesson screen.
   */
  updateTrack: (genderTrack: GenderTrack) => Promise<AuthResult>;
}

/** Set just before a deliberate sign-out, so the auth listener can tell it
    apart from a session that was dropped on its own. */
let userInitiatedSignOut = false;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, phone, email, role, gender_track, language, account_status, free_access, track_confirmed, current_streak, best_streak, total_completed_days, created_at, updated_at, last_login_at'
    )
    .eq('id', userId)
    .single();

  if (error) {
    // A logged-in user with no loadable profile gets stuck at the gate
    // screens — one of the main "I can't get in" causes, so always log it.
    logEvent('error', 'auth.profile_load_failed', {
      message: error.message,
      context: { userId, code: error.code, details: error.details, hint: error.hint },
    });
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
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (sessionError) {
        logEvent('error', 'auth.session_restore_failed', {
          message: sessionError.message,
          context: { error: describeError(sessionError) },
        });
      }

      setSession(data.session);
      if (data.session) {
        const loadedProfile = await fetchProfile(data.session.user.id);
        if (isMounted) setProfile(loadedProfile);
      }
      setLoading(false);
    }

    loadInitialSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      // A session that disappears without the user pressing "sign out"
      // (expired/invalid refresh token) looks to them like "it logged me out".
      if (event === 'SIGNED_OUT' && !userInitiatedSignOut) {
        logEvent('warning', 'auth.signed_out_unexpectedly');
      }
      userInitiatedSignOut = false;
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
    if (error) {
      // Wrong password is routine (warning); anything else — network,
      // unconfirmed email, server error — is a real problem (error).
      const isBadCredentials = error.code === 'invalid_credentials';
      logEvent(isBadCredentials ? 'warning' : 'error', 'auth.login_failed', {
        message: error.message,
        email,
        context: { code: error.code ?? null, status: error.status ?? null },
      });
    } else {
      logEvent('info', 'auth.login_success', { email });
    }
    return { error: error?.message ?? null };
  }

  async function signUp(input: SignUpInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      logEvent(error.code === 'user_already_exists' ? 'warning' : 'error', 'auth.register_failed', {
        message: error.message,
        email: input.email,
        context: { step: 'auth.signUp', code: error.code ?? null, status: error.status ?? null },
      });
      return { error: error.message };
    }

    if (!data.user) {
      logEvent('error', 'auth.register_failed', {
        message: 'Sign up did not return a user.',
        email: input.email,
        context: { step: 'auth.signUp' },
      });
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
      logEvent('error', 'auth.register_failed', {
        message: profileError.message,
        email: input.email,
        context: {
          step: 'profiles.insert',
          userId: data.user.id,
          hasSession: Boolean(data.session),
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        },
      });
      return { error: profileError.message };
    }

    const loadedProfile = await fetchProfile(data.user.id);
    setProfile(loadedProfile);
    logEvent('info', 'auth.register_success', { email: input.email });

    return { error: null };
  }

  async function signOut(): Promise<void> {
    userInitiatedSignOut = true;
    logEvent('info', 'auth.logout');
    await supabase.auth.signOut();
  }

  async function updateTrack(genderTrack: GenderTrack): Promise<AuthResult> {
    if (!profile) {
      return { error: 'No profile loaded.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ gender_track: genderTrack, track_confirmed: true })
      .eq('id', profile.id);

    if (error) {
      logEvent('error', 'profile.update_track_failed', {
        message: error.message,
        context: { genderTrack, code: error.code },
      });
      return { error: error.message };
    }

    setProfile({ ...profile, gender_track: genderTrack, track_confirmed: true });
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, updateTrack }}>
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
