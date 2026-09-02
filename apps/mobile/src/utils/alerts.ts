/**
 * Imperative notify()/confirmAsync() calls backed by a custom in-app dialog
 * (see src/components/AppAlertHost.tsx, mounted once at the app root) —
 * NOT the browser's window.alert()/confirm() and NOT React Native's
 * Alert.alert(). Those were each tried first and both had real problems:
 * Alert.alert() is a silent no-op on react-native-web (nothing shows, and
 * any logic inside its button callbacks never runs), and the browser's
 * native confirm()/alert() do work but look like generic browser chrome —
 * jarringly inconsistent with the app's own design. This gives one
 * cross-platform, on-brand dialog instead.
 *
 * Kept as plain importable functions (not a hook) so any screen or service
 * can call them without needing to be inside a component that consumes a
 * context — AppAlertHost registers itself here via `registerDialogHandler`
 * once it mounts.
 */

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive (red) action — e.g. deleting something. */
  destructive?: boolean;
}

export interface DialogRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string; // omitted => single-button "notify" dialog
  destructive?: boolean;
}

type DialogHandler = (request: DialogRequest) => Promise<boolean>;

let handler: DialogHandler | null = null;

/** Called by AppAlertHost only — do not call this from screen code. */
export function registerDialogHandler(next: DialogHandler | null): void {
  handler = next;
}

export async function notify(title: string, message?: string): Promise<void> {
  if (!handler) return;
  await handler({ title, message, confirmLabel: 'אישור' });
}

export async function confirmAsync(title: string, message?: string, options?: ConfirmOptions): Promise<boolean> {
  if (!handler) return false;
  return handler({
    title,
    message,
    confirmLabel: options?.confirmLabel ?? 'אישור',
    cancelLabel: options?.cancelLabel ?? 'ביטול',
    destructive: options?.destructive,
  });
}
