/** Mirrors the `dedication_duration_options` table — admin-managed price tiers for dedications. */
export interface DedicationDurationOption {
  id: string;
  label: string;
  duration_days: number;
  price: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
