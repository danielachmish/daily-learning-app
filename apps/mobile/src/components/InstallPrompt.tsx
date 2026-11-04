import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n/strings';
import { colors } from '../theme/colors';
import { GradientButton } from './GradientButton';

/**
 * Web-only "add to home screen" sheet, shown once the user is logged in and
 * is browsing the site (not the installed app). Three variants:
 * - Android/Chrome: a real "Install" button that opens the browser's own
 *   install dialog (via the captured `beforeinstallprompt` event).
 * - iPhone Safari: Apple offers no install API, so step-by-step instructions.
 * - Inside an in-app browser (WhatsApp, Instagram…): installing is impossible
 *   there on any phone, so it asks to reopen the link in a real browser —
 *   the common case, since access links are sent over WhatsApp.
 * "Not now" hides it for a week. Native builds render nothing.
 */

const DISMISS_KEY = 'installPromptDismissedAt';
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 1500;
/** Paying is the one place an interruption would actually hurt. */
const HIDDEN_ON_PATHS = ['/paywall', '/payment', '/blocked'];

type Variant = 'native' | 'ios' | 'inApp';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Chrome fires beforeinstallprompt once, early on page load — usually before
// login — so it's captured at module load and held until the sheet shows.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (isWeb) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own sheet instead of Chrome's mini-bar
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((notify) => notify());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((notify) => notify());
  });
  // Chrome only offers install for a site with a service worker. sw.js only
  // handles push notifications (no caching), so registering it early is harmless.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectVariant(): Variant | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  if (!isIOS && !isAndroid) return null; // desktop: nothing to add to a home screen

  // Known in-app browsers, Android WebViews ("; wv)"), and iOS web views
  // (which drop the "Safari" token that Safari and Chrome-on-iOS keep).
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua) || (isIOS && !/Safari/i.test(ua));
  if (inApp) return 'inApp';
  if (isIOS) return 'ios';
  // Android: only when Chrome says it's installable — if the event never
  // fired, the app is most likely installed already.
  return deferredPrompt ? 'native' : null;
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // private mode etc. — it'll just show again next visit
  }
}

export function InstallPrompt() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [copied, setCopied] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!isWeb) return;
    const notify = () => rerender((n) => n + 1);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  const hiddenHere = HIDDEN_ON_PATHS.some((path) => pathname?.startsWith(path));

  useEffect(() => {
    if (!isWeb || !profile || hiddenHere || variant) return;
    if (isStandalone() || dismissedRecently()) return;
    const timer = setTimeout(() => setVariant(detectVariant()), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
    // deferredPrompt changes trigger a rerender via `listeners` above.
  }, [profile?.id, hiddenHere, variant, deferredPrompt]);

  if (!isWeb || !profile || !variant || hiddenHere) return null;

  const s = t(profile.language).installPrompt;

  function close() {
    rememberDismiss();
    setVariant(null);
  }

  async function handleInstall() {
    const prompt = deferredPrompt;
    if (!prompt) return close();
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'dismissed') rememberDismiss();
    setVariant(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      // clipboard blocked in some in-app browsers — the message already explains "Open in browser"
    }
  }

  const title = variant === 'ios' ? s.iosTitle : variant === 'inApp' ? s.inAppTitle : s.title;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Inner Pressable swallows taps so tapping the sheet itself doesn't close it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Image source={{ uri: '/pwa-192.png' }} style={styles.icon} />
          <Text style={styles.title}>{title}</Text>

          {variant === 'native' && <Text style={styles.message}>{s.message}</Text>}
          {variant === 'inApp' && <Text style={styles.message}>{s.inAppMessage}</Text>}
          {variant === 'ios' && (
            <View style={styles.steps}>
              {[s.iosStep1, s.iosStep2, s.iosStep3].map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* GradientButton's own Pressable doesn't stretch — the wrapper does (see its comment). */}
          <View style={styles.ctaWrap}>
            <GradientButton
              style={styles.cta}
              onPress={variant === 'native' ? handleInstall : variant === 'inApp' ? handleCopy : close}
            >
              <Text style={styles.ctaText}>
                {variant === 'native'
                  ? s.installButton
                  : variant === 'inApp'
                    ? copied
                      ? s.linkCopied
                      : s.copyLink
                    : s.gotIt}
              </Text>
            </GradientButton>
          </View>

          {variant !== 'ios' && (
            <Pressable onPress={close} hitSlop={8}>
              <Text style={styles.notNow}>{s.notNow}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(38, 50, 74, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480, // matches the app frame on web (app/_layout.tsx)
    backgroundColor: colors.paper50,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate500,
    textAlign: 'center',
  },
  steps: {
    alignSelf: 'stretch',
    gap: 10,
    marginVertical: 4,
  },
  step: {
    flexDirection: 'row', // flipped by the app's global RTL sync
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink900,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink900,
  },
  ctaWrap: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.onTeal,
    fontSize: 15,
    fontWeight: '700',
  },
  notNow: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 4,
  },
});
