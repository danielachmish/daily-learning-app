# Prompts.md — פרומפטים מוכנים ל־Claude Code לפי שלבים

## איך להשתמש

לא להדביק את כל הפרומפטים יחד.

בכל פעם לעבוד על שלב אחד בלבד.

לפני כל פרומפט יש לוודא ש־Claude קרא את הקבצים:

- 00_Product_Spec.md
- 01_Architecture.md
- 02_Database.md
- 03_BuildPlan.md
- 04_ClaudeRules.md

---

# Prompt 0 — Load Context

```txt
Read the project documentation files:

- docs/00_Product_Spec.md
- docs/01_Architecture.md
- docs/02_Database.md
- docs/03_BuildPlan.md
- docs/04_ClaudeRules.md

Do not write code yet.

After reading, summarize:
1. The product goal
2. The architecture
3. The database approach
4. The build phases
5. The hard rules you must follow

Then wait for my next instruction.
```

---

# Prompt 1 — Create Monorepo Structure

```txt
Build only Phase 0 from BuildPlan.md: monorepo structure.

Requirements:
- apps/mobile for React Native + Expo
- apps/admin for Next.js
- packages/shared for shared types/constants
- supabase/migrations
- supabase/functions
- docs folder
- TypeScript only
- No feature implementation yet
- Do not build auth, lessons, payments, or admin features yet

Before coding, list the files you will create/change.

After coding, provide:
1. Summary
2. Files changed
3. How to run mobile
4. How to run admin
5. Next step
```

---

# Prompt 2 — Database Migrations

```txt
Build only Phase 1 from BuildPlan.md: Supabase database migrations.

Use docs/02_Database.md as the source of truth.

Create migrations for:
- profiles
- subscriptions
- lessons
- lesson_images
- learning_progress
- dedications
- settings
- notification_settings
- daily_lesson_stats
- daily_revenue_stats
- payments

Also create:
- indexes
- unique constraints
- RLS enablement
- helper functions is_admin and has_active_access
- seed values for settings

Do not build frontend code.
Do not build payment integration.
Do not build admin screens.

Before coding, list affected files.
After coding, explain how to run and test migrations.
```

---

# Prompt 3 — Shared Types

```txt
Create shared TypeScript types in packages/shared based on the database schema.

Types required:
- UserProfile
- Subscription
- Lesson
- LessonImage
- LearningProgress
- Dedication
- Payment
- DailyLessonStats
- DailyRevenueStats
- NotificationSettings

Rules:
- No any
- Use string union types for statuses
- Export all types from a central index.ts
- Do not build UI
- Do not change database migrations

Before coding, list files to create/change.
After coding, explain how these types should be used by mobile and admin.
```

---

# Prompt 4 — Mobile Auth

```txt
Build only Phase 2: Mobile Auth + Profiles.

Implement in apps/mobile:
- Supabase client setup
- Auth screens: login and register
- Registration fields:
  - full name
  - phone
  - email
  - password
  - gender_track: men/women
  - language: he/en
- Create profile after signup
- Load current user profile after login
- Basic session handling

Rules:
- TypeScript only
- No any
- Do not build lessons yet
- Do not build payments yet
- Do not build admin yet
- Add loading and error states
- Hebrew UI should support RTL

Before coding, list files.
After coding, provide manual test steps.
```

---

# Prompt 5 — Access Control + Paywall

```txt
Build only Phase 3: Access Control and Paywall in the mobile app.

Implement:
- Function/service to check whether user has active access
- Access is true if:
  - account_status is active
  - and free_access is true OR active subscription exists with end_date >= today
- If no access, show Paywall screen
- If blocked, show blocked account screen
- Add placeholder subscription buttons but do not integrate payments yet

Rules:
- Do not build real payment integration yet
- Do not build lessons yet except placeholder protected screen
- No heavy queries
- No any

After coding, explain how to test:
1. user without subscription
2. user with free_access
3. blocked user
```

---

# Prompt 6 — Mobile Daily Lesson Screen

```txt
Build only Phase 4: Mobile Lessons display.

Implement:
- Daily lesson screen
- Fetch lesson by selected date, profile gender_track, profile language, status=published
- Fetch lesson_images ordered by sort_order
- Show lesson_date, hebrew_date, title, images
- Previous day and next day navigation
- Empty state: “לא קיים לימוד לתאריך זה.”
- Loading and error states
- Do not show content if user has no active access

Rules:
- Do not build complete button yet
- Do not build calendar yet
- Do not build dedications yet
- Use efficient queries
- No select all
- No any

After coding, provide test steps.
```

---

# Prompt 7 — Admin Auth Shell

```txt
Build only Phase 5: Admin basic shell.

Implement in apps/admin:
- Supabase client
- Admin login
- Check role=admin from profiles
- Reject non-admin users
- Admin dashboard layout shell
- Navigation links:
  - Dashboard
  - Users
  - Subscriptions
  - Lessons
  - Dedications
  - Settings
  - Reports

Rules:
- Do not build actual management screens yet
- Do not build payments
- TypeScript only
- No any

After coding, provide test steps for admin and non-admin.
```

---

# Prompt 8 — Admin Lessons Management

```txt
Build only Phase 6: Admin Lessons Management.

Implement:
- Lessons list with pagination
- Filters: date, gender_track, language, status
- Create lesson form
- Edit lesson form
- Delete lesson with confirmation
- Duplicate lesson action
- Upload images to Supabase Storage
- Save lesson_images with sort_order
- Reorder images
- Delete image
- Publish/draft status

Rules:
- Use unique constraint lesson_date + gender_track + language
- Do not fetch all lessons
- Do not build user management
- Do not build dedications
- No any

After coding, provide manual tests.
```

---

# Prompt 9 — Complete Lesson + Streak

```txt
Build only Phase 7: Complete Lesson and Streak.

Implement an atomic complete lesson flow.

Preferred implementation:
- Supabase RPC or Edge Function complete_lesson

The function must:
1. verify auth user
2. verify active access
3. verify lesson is published and matches user profile
4. insert learning_progress with unique protection
5. if newly inserted:
   - increment daily_lesson_stats.completed_count
   - update profiles.current_streak
   - update profiles.best_streak
   - update profiles.total_completed_days
6. if already completed, do not increment again

Mobile UI:
- Add “סיימתי” button
- Show “הושלם” if already completed
- Show encouragement message after completion

Rules:
- This must be safe against double-clicks
- No client-side counter increment as source of truth
- No any

After coding, provide test cases.
```

---

# Prompt 10 — Calendar

```txt
Build only Phase 8: Calendar.

Implement mobile calendar screen:
- Monthly view
- Fetch lessons for current month matching user gender_track and language
- Fetch user learning_progress for current month
- Mark days:
  - completed
  - missed
  - no lesson
  - today
- Tap date to open that day’s lesson

Rules:
- Query only selected month
- Do not fetch all progress history
- Do not fetch all lessons
- No any

After coding, provide test steps.
```

---

# Prompt 11 — User Dedications

```txt
Build only Phase 9: User Dedications.

Implement mobile screens:
- Create dedication
- My dedications
- Today’s dedications

Create dedication fields:
- dedication_date
- type
- dedication_text
- donor_name optional
- amount from settings.dedication_price

Initial statuses:
- payment_status=pending
- approval_status=pending

Today’s dedications should show only:
- payment_status=paid
- approval_status=approved

Rules:
- Do not build real payment integration yet
- Do not let client set paid manually
- No any

After coding, provide test steps.
```

---

# Prompt 12 — Admin Dedications

```txt
Build only Phase 10: Admin Dedications.

Implement admin panel dedications screen:
- List with pagination
- Filters by date, payment_status, approval_status, type
- View full dedication
- Approve
- Reject
- Hide
- Edit dedication_text

Rules:
- Only admin can approve/reject/hide/edit
- Do not fetch all dedications
- No any

After coding, provide test steps.
```

---

# Prompt 13 — Payments Integration

```txt
Build only Phase 11: Payments.

Implement payment architecture using an external provider with webhooks.

Needed:
- create checkout session for subscription monthly/yearly
- create checkout session for dedication payment
- verified webhook handler
- update payments table
- update subscriptions after successful subscription payment
- update dedications.payment_status after successful dedication payment
- update daily_revenue_stats

Rules:
- Client must never mark payment as paid
- Webhook must verify provider signature
- Do not store credit card data
- Use environment variables for secrets
- No hardcoded secrets
- No any

Before coding, explain the selected provider assumptions.
After coding, explain how to test with provider sandbox.
```

---

# Prompt 14 — Admin Users and Subscriptions

```txt
Build only Phase 12: Admin Users and Subscriptions.

Implement:
- Users list with pagination
- Search by full_name, phone, email
- View user profile
- Change gender_track
- Change language
- Toggle free_access
- Block/unblock user
- Subscriptions list
- Filter by status and plan_type
- Manually extend subscription
- Cancel subscription manually

Rules:
- Admin only
- Do not fetch all users
- Do not run heavy queries
- No any

After coding, provide test steps.
```

---

# Prompt 15 — Reports and Dashboard

```txt
Build only Phase 13: Reports and Dashboard.

Implement admin dashboard using stats tables where possible.

Show:
- total users
- active subscriptions
- new users today/month
- learned today/week/month
- dedications today/month
- pending dedications
- subscription revenue
- dedication revenue
- total revenue by month

Rules:
- Do not calculate heavy metrics from raw tables on every page load
- Use daily_lesson_stats and daily_revenue_stats
- Use date filters
- Use pagination for drill-down lists
- No any

After coding, explain which metrics come from stats tables and which are direct queries.
```

---

# Prompt 16 — Notifications and Sharing

```txt
Build only Phase 14: Notifications and Sharing.

Mobile app:
- Notification settings screen
- Enable/disable daily reminder
- Select reminder time
- Save to notification_settings
- Schedule local notification with expo-notifications
- Share button on lesson screen
- Share text with app link and short message

Rules:
- Use local notifications only for V1
- Do not build server push notifications
- Support Hebrew and English
- No any

After coding, provide test steps for Android and iOS.
```

---

# Prompt 17 — Polish and Release Prep

```txt
Build only Phase 15: Polish and Release Prep.

Focus on:
- RTL/LTR polish
- Loading states
- Error states
- Empty states
- Image loading placeholders
- App icon placeholders
- Splash screen
- Privacy policy link placeholder
- Terms link placeholder
- Android build readiness
- iOS build readiness

Rules:
- Do not introduce new product features
- Do not refactor unrelated areas
- No any

After coding, provide release checklist.
```
