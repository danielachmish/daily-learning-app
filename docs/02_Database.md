# Database.md — בסיס נתונים, אינדקסים והרשאות

## 1. עקרונות DB

המערכת בנויה על PostgreSQL דרך Supabase.

חובה:

- להשתמש ב־UUID לכל ID
- להפעיל RLS בכל הטבלאות הרגישות
- להשתמש באינדקסים
- להגדיר unique constraints למניעת כפילויות
- להשתמש ב־timestamps
- לא לשמור נתוני תשלום רגישים
- לא לשמור פרטי אשראי

---

## 2. Enums מומלצים

אפשר להשתמש ב־text עם check constraints או ליצור enums.

ערכים נדרשים:

```txt
gender_track: men, women
language: he, en
role: user, admin
lesson_status: draft, published
subscription_status: active, expired, canceled, payment_failed
payment_status: pending, paid, failed, refunded
approval_status: pending, approved, rejected, hidden
plan_type: monthly, yearly
dedication_type: memory, healing, success, marriage, thanks, other
```

---

## 3. profiles

טבלת פרופיל משתמש. מחוברת ל־auth.users.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null default 'he' check (language in ('he', 'en')),
  account_status text not null default 'active' check (account_status in ('active', 'blocked')),
  free_access boolean not null default false,
  current_streak int not null default 0,
  best_streak int not null default 0,
  total_completed_days int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
```

אינדקסים:

```sql
create index profiles_role_idx on profiles(role);
create index profiles_email_idx on profiles(email);
create index profiles_phone_idx on profiles(phone);
create index profiles_gender_language_idx on profiles(gender_track, language);
create index profiles_account_status_idx on profiles(account_status);
```

---

## 4. subscriptions

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'expired', 'canceled', 'payment_failed')),
  start_date date not null,
  end_date date not null,
  payment_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

אינדקסים:

```sql
create index subscriptions_user_id_idx on subscriptions(user_id);
create index subscriptions_status_idx on subscriptions(status);
create index subscriptions_end_date_idx on subscriptions(end_date);
create index subscriptions_user_status_idx on subscriptions(user_id, status);
```

---

## 5. lessons

```sql
create table lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  hebrew_date text,
  title text not null,
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null check (language in ('he', 'en')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_date, gender_track, language)
);
```

אינדקסים:

```sql
create index lessons_date_idx on lessons(lesson_date);
create index lessons_status_idx on lessons(status);
create index lessons_track_lang_date_idx on lessons(gender_track, language, lesson_date);
create index lessons_published_lookup_idx on lessons(lesson_date, gender_track, language, status);
```

---

## 6. lesson_images

```sql
create table lesson_images (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
```

אינדקסים:

```sql
create index lesson_images_lesson_id_idx on lesson_images(lesson_id);
create index lesson_images_order_idx on lesson_images(lesson_id, sort_order);
```

---

## 7. learning_progress

```sql
create table learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  lesson_date date not null,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);
```

אינדקסים:

```sql
create index learning_progress_user_id_idx on learning_progress(user_id);
create index learning_progress_lesson_date_idx on learning_progress(lesson_date);
create index learning_progress_user_date_idx on learning_progress(user_id, lesson_date);
create index learning_progress_lesson_id_idx on learning_progress(lesson_id);
```

---

## 8. dedications

```sql
create table dedications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  dedication_date date not null,
  type text not null check (type in ('memory', 'healing', 'success', 'marriage', 'thanks', 'other')),
  dedication_text text not null,
  donor_name text,
  amount numeric(10,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'hidden')),
  payment_provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
```

אינדקסים:

```sql
create index dedications_user_id_idx on dedications(user_id);
create index dedications_date_idx on dedications(dedication_date);
create index dedications_payment_status_idx on dedications(payment_status);
create index dedications_approval_status_idx on dedications(approval_status);
create index dedications_public_lookup_idx on dedications(dedication_date, payment_status, approval_status);
```

---

## 9. settings

```sql
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

דוגמאות:

```txt
dedication_price = 36
dedication_enabled = true
monthly_price = 20
yearly_price = 200
```

---

## 10. notification_settings

```sql
create table notification_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  enabled boolean not null default false,
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 11. daily_lesson_stats

טבלת מונים יומית כדי לא להריץ count כבד.

```sql
create table daily_lesson_stats (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null check (language in ('he', 'en')),
  completed_count int not null default 0,
  dedications_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_date, gender_track, language)
);
```

אינדקסים:

```sql
create index daily_lesson_stats_date_idx on daily_lesson_stats(lesson_date);
create index daily_lesson_stats_lookup_idx on daily_lesson_stats(lesson_date, gender_track, language);
```

---

## 12. daily_revenue_stats

```sql
create table daily_revenue_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null unique,
  subscription_revenue numeric(10,2) not null default 0,
  dedication_revenue numeric(10,2) not null default 0,
  total_revenue numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 13. payments

טבלת תשלומים כללית לתיעוד.

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  payment_type text not null check (payment_type in ('subscription', 'dedication')),
  related_id uuid,
  amount numeric(10,2) not null,
  currency text not null default 'ILS',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider text,
  provider_payment_id text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

אינדקסים:

```sql
create index payments_user_id_idx on payments(user_id);
create index payments_status_idx on payments(status);
create index payments_type_idx on payments(payment_type);
create index payments_created_at_idx on payments(created_at);
```

---

## 14. RLS — מדיניות כללית

יש להפעיל RLS:

```sql
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table lessons enable row level security;
alter table lesson_images enable row level security;
alter table learning_progress enable row level security;
alter table dedications enable row level security;
alter table settings enable row level security;
alter table notification_settings enable row level security;
alter table daily_lesson_stats enable row level security;
alter table daily_revenue_stats enable row level security;
alter table payments enable row level security;
```

---

## 15. Helper Functions

### is_admin

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;
```

### has_active_access

```sql
create or replace function public.has_active_access(user_uuid uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles p
    where p.id = user_uuid
    and p.account_status = 'active'
    and (
      p.free_access = true
      or exists (
        select 1 from subscriptions s
        where s.user_id = user_uuid
        and s.status = 'active'
        and s.end_date >= current_date
      )
    )
  );
$$;
```

---

## 16. RLS עקרוני

### profiles

- משתמש יכול לקרוא ולעדכן את הפרופיל שלו בלבד
- מנהל יכול לקרוא ולעדכן את כולם

### lessons

- מנהל יכול CRUD מלא
- משתמש יכול לקרוא רק לימודים published שמתאימים למסלול ולשפה שלו ויש לו גישה פעילה

### lesson_images

- משתמש יכול לקרוא תמונות רק של לימודים שמותר לו לראות
- מנהל יכול CRUD מלא

### learning_progress

- משתמש יכול לקרוא וליצור progress רק לעצמו
- מנהל יכול לקרוא הכול
- לא לאפשר update/delete מצד משתמש רגיל

### dedications

- משתמש יכול ליצור הקדשה לעצמו
- משתמש יכול לראות הקדשות שלו
- כל משתמש עם גישה יכול לראות הקדשות paid+approved לפי תאריך
- מנהל יכול הכול

### settings

- משתמש יכול לקרוא רק הגדרות ציבוריות כמו dedication_price/dedication_enabled
- מנהל יכול לערוך

### payments

- משתמש יכול לקרוא תשלומים שלו בלבד
- מנהל יכול לקרוא הכול
- יצירה/עדכון עדיף דרך Edge Functions בלבד

---

## 17. פונקציית complete_lesson

יש לבנות RPC/Edge Function לסימון “סיימתי” כדי לבצע פעולה אטומית:

1. לבדוק שהמשתמש מחובר
2. לבדוק שיש לו גישה פעילה
3. לבדוק שהלימוד published ומתאים לפרופיל
4. לבצע insert ל־learning_progress עם on conflict do nothing
5. אם נוצר record חדש:
   - לעדכן daily_lesson_stats.completed_count + 1
   - לעדכן profiles.current_streak
   - לעדכן profiles.best_streak
   - לעדכן profiles.total_completed_days
6. להחזיר סטטוס completed/already_completed

---

## 18. שיקולי סקייל

חובה:

- לא להשתמש ב־select * ברשימות גדולות
- לא לשלוף תמונות של כל הלימודים מראש
- לא להריץ count על learning_progress בכל טעינת דשבורד
- להשתמש ב־daily_lesson_stats לדשבורד ולמונה “למדו היום”
- להשתמש ב־daily_revenue_stats להכנסות יומיות/חודשיות
- להשתמש ב־pagination בפאנל מנהל
- להשתמש ב־search indexes לפי email/phone/name אם צריך
