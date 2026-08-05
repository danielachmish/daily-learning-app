/** Mirrors the `daily_revenue_stats` table. */
export interface DailyRevenueStats {
  id: string;
  stat_date: string;
  subscription_revenue: number;
  dedication_revenue: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}
