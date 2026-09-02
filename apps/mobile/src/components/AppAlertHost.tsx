import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { registerDialogHandler, type DialogRequest } from '../utils/alerts';

interface PendingDialog extends DialogRequest {
  resolve: (value: boolean) => void;
}

/**
 * Renders notify()/confirmAsync() calls (see src/utils/alerts.ts) as a
 * dialog styled to match the app instead of the browser's or the OS's own
 * generic alert chrome. Mount exactly once, at the app root (app/_layout.tsx).
 */
export function AppAlertHost() {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);

  useEffect(() => {
    registerDialogHandler((request) => new Promise<boolean>((resolve) => setDialog({ ...request, resolve })));
    return () => registerDialogHandler(null);
  }, []);

  function respond(result: boolean) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <Modal transparent visible={dialog !== null} animationType="fade" onRequestClose={() => respond(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{dialog?.title}</Text>
          {dialog?.message && <Text style={styles.message}>{dialog.message}</Text>}
          <View style={styles.buttonRow}>
            {dialog?.cancelLabel && (
              <Pressable style={styles.cancelButton} onPress={() => respond(false)}>
                <Text style={styles.cancelButtonText}>{dialog.cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.confirmButton, dialog?.destructive && styles.destructiveButton]}
              onPress={() => respond(true)}
            >
              <Text style={[styles.confirmButtonText, dialog?.destructive && styles.destructiveButtonText]}>
                {dialog?.confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(38, 50, 74, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.paper50,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: 2,
  },
  buttonRow: {
    // Plain 'row' — the app already syncs I18nManager RTL globally
    // (see syncAppDirection in app/_layout.tsx), which flips 'row' for us;
    // reversing it here too would flip it right back.
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.teal400,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.onTeal,
    fontSize: 14,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  destructiveButtonText: {
    color: colors.paper50,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: '700',
  },
});
