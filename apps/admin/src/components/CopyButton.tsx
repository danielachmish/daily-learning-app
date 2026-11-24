'use client';

import { useState } from 'react';

import { copyToClipboard } from '../services/appEventLog';

interface Props {
  /** Built lazily on click — some reports need a fetch first. */
  getText: () => string | Promise<string>;
  label?: string;
  variant?: 'small' | 'primary';
}

/** "העתק" button that copies a ready-to-paste problem report. */
export function CopyButton({ getText, label = 'העתק', variant = 'small' }: Props) {
  const [state, setState] = useState<'idle' | 'working' | 'copied' | 'failed'>('idle');

  async function handleClick() {
    setState('working');
    const text = await getText();
    const ok = await copyToClipboard(text);
    setState(ok ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 2000);
  }

  const text =
    state === 'copied' ? '✓ הועתק' : state === 'failed' ? 'ההעתקה נכשלה' : state === 'working' ? 'מכין…' : label;

  const className =
    variant === 'primary'
      ? 'rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-on-teal hover:bg-teal-900 disabled:opacity-50'
      : 'shrink-0 whitespace-nowrap rounded-full border border-teal-400 px-2.5 py-0.5 text-xs text-teal-600 hover:bg-teal-100 disabled:opacity-50';

  return (
    <button type="button" onClick={handleClick} disabled={state === 'working'} className={className}>
      {text}
    </button>
  );
}
