import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export type EventLevel = 'info' | 'warning' | 'error';

interface LogOptions {
  message?: string | null;
  context?: Record<string, unknown>;
  /** Only needed before login (e.g. a failed sign-in), so the event can
      still be tied to who it happened to. Once logged in, the server takes
      the email from the session itself. */
  email?: string | null;
}

/** Same event + message within this window is logged once — stops a
    re-rendering screen or a retry loop from writing dozens of rows. */
const DEDUPE_WINDOW_MS = 5000;
const recent = new Map<string, number>();

let currentScreen: string | null = null;

/** Called from the root layout on every navigation so each event says
    which screen the user was on. */
export function setCurrentScreen(pathname: string): void {
  currentScreen = pathname;
}

function deviceContext(): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    platform: Platform.OS,
    osVersion: String(Platform.Version ?? ''),
    appVersion: Constants.expoConfig?.version ?? null,
    screen: currentScreen,
  };
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    ctx.url = window.location?.href;
    ctx.userAgent = window.navigator?.userAgent;
    ctx.online = window.navigator?.onLine;
  }
  return ctx;
}

/** Turns anything thrown into something JSON-safe and readable. */
export function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const extra = error as Error & { status?: number; code?: string; context?: unknown };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 15).join('\n'),
      ...(extra.status !== undefined ? { status: extra.status } : {}),
      ...(extra.code !== undefined ? { code: extra.code } : {}),
    };
  }
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
    } catch {
      return { value: String(error) };
    }
  }
  return { value: String(error) };
}

/**
 * Fire-and-forget event log to app_event_log (via the log_app_event RPC),
 * shown in the admin panel's "יומן מערכת" page. Never throws and never
 * awaits in a way that could slow or break the caller — logging must not
 * become a second failure on top of the real one.
 */
export function logEvent(level: EventLevel, event: string, options: LogOptions = {}): void {
  try {
    const message = options.message ?? null;
    const key = `${level}|${event}|${message ?? ''}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
    recent.set(key, now);
    if (recent.size > 200) recent.clear();

    const context = { ...deviceContext(), ...(options.context ?? {}) };
    void supabase
      .rpc('log_app_event', {
        p_level: level,
        p_event: event,
        p_message: message,
        p_context: context,
        p_email: options.email ?? null,
      })
      .then(
        () => undefined,
        () => undefined
      );
  } catch {
    // Nowhere further to report a logging failure.
  }
}

let handlersInstalled = false;

/**
 * Catches crashes that no screen handled itself: uncaught JS errors and
 * unhandled promise rejections (web), and React Native's global error
 * handler (native) — the "the app just went white / closed" reports.
 */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (e: ErrorEvent) => {
      logEvent('error', 'app.uncaught_error', {
        message: e.message,
        context: {
          error: describeError(e.error),
          source: e.filename,
          line: e.lineno,
          column: e.colno,
        },
      });
    });
    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      const reason = describeError(e.reason);
      logEvent('error', 'app.unhandled_rejection', {
        message: typeof reason.message === 'string' ? reason.message : null,
        context: { error: reason },
      });
    });
    return;
  }

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const described = describeError(error);
    logEvent('error', isFatal ? 'app.fatal_error' : 'app.uncaught_error', {
      message: typeof described.message === 'string' ? described.message : null,
      context: { error: described, isFatal: Boolean(isFatal) },
    });
    previous(error, isFatal);
  });
}

interface ErrorUtilsLike {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}
