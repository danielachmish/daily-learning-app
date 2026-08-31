import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';

type Phase = 'loading' | 'paying' | 'confirming' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 45; // ~90 seconds

const iframeStyle: React.CSSProperties = { flex: 1, width: '100%', border: 'none' };

/**
 * Embeds Nedarim Plus's secure payment iframe. Confirmed against their
 * official API docs (org-account-gated PDF, obtained directly from
 * Nedarim and read in full) — the "server-side transaction creation"
 * flow: create-nedarim-payment already opened the transaction with
 * Nedarim (real, server-validated amount) and handed this screen only an
 * opaque transaction ID. Once the iframe signals it's ready (a `{ Name:
 * 'Height' }` message, used here to size it too), this screen relays
 * that ID via `{ Name: 'FinishTransaction', Value: <id> }` — no payment
 * fields ever pass through this page. The iframe completes the card
 * entry/charge itself and posts back `{ Name: 'TransactionResponse',
 * Value: { Status, Message, ... } }`, Status 'OK' | 'Error'.
 *
 * That response is a confirmed, real signal (not a guess) but is still
 * only used for UX here — the database is only ever updated by
 * nedarim-callback (server-to-server, IP-checked: per the docs, a
 * spoofed postMessage from a malicious client cannot fake that).
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
  const sentTransactionRef = useRef(false);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function sendTransactionToIframe() {
    if (sentTransactionRef.current) return;
    const win = iframeRef.current?.contentWindow;
    if (!win || !nedarimTransactionId) return;
    sentTransactionRef.current = true;
    win.postMessage({ Name: 'FinishTransaction', Value: nedarimTransactionId }, '*');
    setPhase('paying');
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
        // The iframe reporting its rendered height is also our best
        // available "it's ready" signal — matches Nedarim's own sample,
        // which uses this same event to hide its loading spinner.
        sendTransactionToIframe();
      } else if (name === 'TransactionResponse') {
        const result = event.data.Value ?? {};
        if (result.Status === 'Error') {
          setErrorMessage(result.Message ?? 'התשלום לא הושלם.');
          setPhase('failed');
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

  if (!iframeUrl || !nedarimTransactionId || !paymentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.message}>חסרים פרטי תשלום. יש לחזור ולנסות שוב.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {(phase === 'loading' || phase === 'paying') && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>תשלום מאובטח</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.cancelText}>ביטול</Text>
            </Pressable>
          </View>
          {/* Raw <iframe> — valid on web via react-native-web's JSX passthrough. */}
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            style={{ ...iframeStyle, height: iframeHeight, flex: undefined }}
            onLoad={sendTransactionToIframe}
          />
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

      {phase === 'failed' && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{errorMessage ?? 'התשלום לא הושלם.'}</Text>
          <Pressable style={styles.manualCheckButton} onPress={() => router.back()}>
            <Text style={styles.manualCheckText}>לנסות שוב</Text>
          </Pressable>
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
    fontSize: 17,
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
