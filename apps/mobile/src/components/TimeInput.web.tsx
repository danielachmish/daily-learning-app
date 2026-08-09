import { colors } from '../theme/colors';

/**
 * Web counterpart to TimeInput.tsx — see that file for why this split
 * exists. Uses a plain native <input type="time">, which every modern
 * browser renders with its own built-in picker UI.
 */
interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

function formatTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function TimeInput({ value, onChange }: Props) {
  return (
    <input
      type="time"
      required
      value={formatTimeValue(value)}
      onChange={(event) => {
        const [hours, minutes] = event.target.value.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
        const next = new Date(value);
        next.setHours(hours, minutes, 0, 0);
        onChange(next);
      }}
      style={{
        alignSelf: 'flex-start',
        border: `1.5px solid ${colors.teal400}`,
        borderRadius: 999,
        padding: '10px 20px',
        fontSize: 18,
        color: colors.teal600,
        fontWeight: 600,
        fontFamily: 'inherit',
        background: 'transparent',
      }}
    />
  );
}
