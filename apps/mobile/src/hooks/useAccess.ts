import type { UserProfile } from '@daily-learning/shared';
import { useEffect, useState } from 'react';

import { supabase } from '../services/supabase';

export type AccessStatus = 'loading' | 'blocked' | 'no_access' | 'active';

/**
 * Derives whether the current user can view protected content.
 * account_status='blocked' always wins; otherwise defers to the
 * has_active_access() DB function (free_access OR active subscription),
 * which is the single source of truth also used by RLS policies.
 */
export function useAccess(profile: UserProfile | null): AccessStatus {
  const [status, setStatus] = useState<AccessStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    if (!profile) {
      setStatus('loading');
      return;
    }

    if (profile.account_status === 'blocked') {
      setStatus('blocked');
      return;
    }

    setStatus('loading');
    supabase
      .rpc('has_active_access', { user_uuid: profile.id })
      .then(({ data, error }) => {
        if (!isMounted) return;
        setStatus(!error && data === true ? 'active' : 'no_access');
      });

    return () => {
      isMounted = false;
    };
  }, [profile]);

  return status;
}
