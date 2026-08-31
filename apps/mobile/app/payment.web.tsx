import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';

type Phase = 'loading' | 'ready' | 'paying' | 'confirming' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 45; // ~90 seconds

const iframeStyle: React.CSSProperties = { width: '100%', border: 'none' };

/**
 * Embeds Nedarim Plus's secure payment iframe. Confirmed against their
 * official API docs (obtained directly from Nedarim) — the "server-side
 * transaction creation" flow: create-nedarim-payment already opened the
 * transaction with Nedarim (real, server-validated amount) and handed this
 * screen only an opaque transaction ID.
 *
 * IMPORTANT, per their docs verbatim: "מה שבתוך האייפרם: שדות הכרטיס
 * בלבד; כל השאר - שדות הפרטים, הסכום וכפתור 'ביצוע תשלום' - יושבים בדף
 * שלכם" (the iframe holds ONLY the card fields — the pay button lives on
 * OUR page). So `{ Name: 'FinishTransaction', Value: <id> }` must be sent
 * only when OUR OWN button below the iframe is pressed, once the donor has
 * actually typed their card details into it — never automatically on load.
 * Sending it early submits empty/incomplete card fields and immediately
 * comes back as an "invalid card" error, which is exactly the bug this
 * screen used to have.
 *
 * The TransactionResponse the iframe posts back is real but is still only
 * used for UX here — the database is only ever updated by nedarim-callback
 * (server-to-server, IP-checked: a spoofed postMessage can't fake that).
 */
export default function PaymentScreenWeb() {
  const { paymentId, iframeUrl, nedarimTransactionId } = useLocalSearchParams<{
    paymentId: string;
    iframeUrl: string;
    nedarimTransactionId: string;
  }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(480);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function postToIframe(data: unknown) {
    iframeRef.current?.contentWindow?.postMessage(data, '*');
  }

  function handlePayPress() {
    if (!nedarimTransactionId) return;
    setErrorMessage(null);
    // Locked immediately (phase moves to 'paying') to prevent a double
    // click sending the transaction twice, per their own recommendation.
    setPhase('paying');
    postToIframe({ Name: 'FinishTransaction', Value: nedarimTransactionId });
  }

  function startPolling() {
    if (pollTimerRef.current) return;
    setPhase('confirming');
    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      const { data } = await supabase.from('payments').select('status').eq('id', paymentId).single();

      if (data?.status === 'paid') {
        clearPolling();
        setPhase('success');
      } else if (data?.status === 'failed') {
        clearPolling();
        setPhase('failed');
      } else if (pollCountRef.current >= MAX_POLLS) {
        clearPolling();
        setPhase('timeout');
      }
    }, POLL_INTERVAL_MS);
  }

  function clearPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const name = event.data?.Name;
      if (name === 'Height') {
        const px = parseInt(event.data.Value, 10);
        if (!Number.isNaN(px)) setIframeHeight(px + 15);
        // The iframe reporting its height is also our "the card form
        // finished rendering" signal — only now is there anything for the
        // donor to actually fill in.
        setPhase((prev) => (prev === 'loading' ? 'ready' : prev));
      } else if (name === 'TransactionResponse') {
        const result = event.data.Value ?? {};
        if (result.Status === 'Error') {
          setErrorMessage(result.Message ?? 'התשלום לא הושלם.');
          setPhase('ready'); // unlock the button so the donor can fix the card and retry
        } else if (result.Status === 'OK') {
          startPolling();
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'success') {
      const timeout = setTimeout(() => router.replace('/'), 2500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  function handleIframeLoad() {
    // Per their sample integration: request the height immediately after
    // the iframe itself (not just our page) finishes loading.
    postToIframe({ Name: 'GetHeight' });
  }

  if (!iframeUrl || !nedarimTransactionId || !paymentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.message}>חסרים פרטי תשלום. יש לחזור ולנסות שוב.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {(phase === 'loading' || phase === 'ready' || phase === 'paying') && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>תשלום מאובטח</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.cancelText}>ביטול</Text>
            </Pressable>
          </View>

          <View style={styles.scrollArea}>
            {phase === 'loading' && (
              <View style={styles.centerFill}>
                <ActivityIndicator size="large" color={colors.teal400} />
              </View>
            )}
            {/* Raw <iframe> — valid on web via react-native-web's JSX passthrough.
                Holds only the card number/expiry/CVV fields, per Nedarim's design. */}
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              style={{ ...iframeStyle, height: iframeHeight, display: phase === 'loading' ? 'none' : 'block' }}
              onLoad={handleIframeLoad}
            />

            {(phase === 'ready' || phase === 'paying') && (
              <View style={styles.payButtonWrap}>
                {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                <Pressable
                  style={[styles.payButton, phase === 'paying' && styles.payButtonDisabled]}
                  onPress={handlePayPress}
                  disabled={phase === 'paying'}
                >
                  {phase === 'paying' ? (
                    <ActivityIndicator size="small" color={colors.onTeal} />
                  ) : (
                    <Text style={styles.payButtonText}>בצע תשלום</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}

      {phase === 'confirming' && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.teal400} />
          <Text style={styles.message}>מוודא מול חברת הסליקה שהתשלום התקבל…</Text>
        </View>
      )}

      {phase === 'success' && (
        <View style={styles.centerFill}>
          <Text style={styles.successText}>התשלום התקבל בהצלחה! 🎉</Text>
        </View>
      )}

      {phase === 'timeout' && (
        <View style={styles.centerFill}>
          <Text style={styles.message}>
            עדיין מעבדים את התשלום — זה יכול לקחת כמה דקות. אפשר לחזור למסך הראשי ולבדוק שוב בהמשך.
          </Text>
          <Pressable style={styles.manualCheckButton} onPress={() => router.replace('/')}>
            <Text style={styles.manualCheckText}>חזרה למסך הראשי</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink900,
  },
  cancelText: {
    fontSize: 14,
    color: colors.slate500,
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  payButtonWrap: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  payButton: {
    backgroundColor: colors.teal400,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    minWidth: 200,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '800',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 15,
    color: colors.ink700,
    textAlign: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
    textAlign: 'center',
  },
  manualCheckButton: {
    margin: 16,
    alignSelf: 'center',
    backgroundColor: colors.teal400,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  manualCheckText: {
    color: colors.onTeal,
    fontSize: 14,
    fontWeight: '700',
  },
});
