# ClaudeRules.md — כללי עבודה מחייבים ל־Claude Code

## 1. Project Identity

You are building a production-ready V1 daily learning mobile application and admin system.

The system must support Android and iPhone users and must be designed for tens of thousands of registered users.

This is not a prototype.

---

## 2. Core Stack

Use the following stack unless explicitly instructed otherwise:

- Mobile App: React Native + Expo
- Admin Panel: Next.js
- Language: TypeScript only
- Backend: Supabase
- Database: PostgreSQL
- Auth: Supabase Auth
- Storage: Supabase Storage
- Server Functions: Supabase Edge Functions
- Payments: External payment provider with webhook verification

---

## 3. Hard Rules

- Do not build everything at once.
- Work step by step.
- Do not change unrelated files.
- Do not invent features that are not in the spec.
- Do not remove existing working code without explaining why.
- Do not use `any` in TypeScript.
- Do not hardcode secrets.
- Do not hardcode payment success from client-side.
- Do not fetch entire large tables.
- Do not run heavy count queries on every screen load.
- Do not bypass RLS.
- Do not implement payment status updates from the client.
- Do not mix admin-only logic inside normal user screens.

---

## 4. Before Writing Code

Before writing code, explain briefly:

1. What will be built in this step
2. Which files will be created or changed
3. Which database tables are affected
4. What assumptions are being made
5. How this step will be tested

---

## 5. After Writing Code

After writing code, provide:

1. Summary of changes
2. Files changed
3. How to test
4. Any known limitation
5. Next recommended step

---

## 6. TypeScript Rules

- Use TypeScript everywhere.
- Do not use `any`.
- Define shared types for:
  - UserProfile
  - Subscription
  - Lesson
  - LessonImage
  - LearningProgress
  - Dedication
  - Payment
  - DailyLessonStats
- Use strict typing for API responses.
- Use validation for form inputs.

---

## 7. Database Rules

- All DB changes must be done through migration files.
- Do not modify production tables manually.
- Every large table must have indexes.
- Every user-owned table must include user_id where relevant.
- Every large list must support pagination.
- Every protected table must have RLS enabled.
- Use unique constraints to prevent duplicates.

Important unique constraints:

- lessons: unique(lesson_date, gender_track, language)
- learning_progress: unique(user_id, lesson_id)
- daily_lesson_stats: unique(lesson_date, gender_track, language)

---

## 8. Performance Rules

The app must support tens of thousands of registered users.

Therefore:

- Always paginate admin lists.
- Always filter by date/status when querying dedications.
- Always filter lessons by date, gender_track, language, status.
- Do not load all lessons for all dates.
- Do not load all users.
- Do not load all dedications.
- Do not calculate dashboard metrics from raw tables on every request.
- Use daily_lesson_stats for completion counters.
- Use daily_revenue_stats for revenue reports.
- Use caching where appropriate.

---

## 9. Security Rules

- Enable RLS on all relevant tables.
- Users can only access their own private data.
- Users can only view published lessons matching their gender_track and language.
- Users can view protected content only if they have active subscription or free_access.
- Admin-only actions must be protected in both frontend and database policies.
- Payment status can only be updated by verified webhook functions.
- Dedication approval can only be changed by admin.
- Never expose service role keys to client apps.

---

## 10. Mobile UX Rules

The app must be very comfortable and pleasant.

- Large readable text
- Clean layout
- Simple navigation
- Smooth loading states
- Friendly empty states
- RTL support for Hebrew
- LTR support for English
- Big clear buttons
- Minimal friction for daily learning
- The “סיימתי” button must be obvious
- The daily lesson screen must be the central screen

---

## 11. Admin UX Rules

The admin panel must be practical and efficient.

- Use tables with pagination
- Use search and filters
- Allow quick editing
- Support duplicate lesson
- Support image ordering
- Show clear statuses
- Use confirmation before destructive actions
- Never make admin wait on heavy queries

---

## 12. Payment Rules

- Use external payment provider only.
- Client may request checkout session.
- Client may not mark payment as paid.
- Webhook must verify provider signature.
- Webhook updates subscriptions, dedications and payments.
- Store provider IDs but not credit card details.
- Handle payment success and payment failure.

---

## 13. Lesson Rules

A user can view a lesson only if:

- user is authenticated
- user account_status is active
- user has active subscription or free_access=true
- lesson.status is published
- lesson.gender_track matches user.gender_track
- lesson.language matches user.language

If no lesson exists for the selected date, show:

“לא קיים לימוד לתאריך זה.”

---

## 14. Dedication Rules

- Any user can create a dedication only after authentication.
- Dedication starts as payment_status=pending and approval_status=pending.
- Dedication is visible publicly only when payment_status=paid and approval_status=approved.
- Admin can approve/reject/hide/edit dedication.
- There is no limit to dedications per day.

---

## 15. Complete Lesson Rules

The complete lesson action must be atomic.

It must:

1. Verify user authentication
2. Verify active access
3. Verify lesson is published and matches user profile
4. Insert learning_progress with conflict prevention
5. If this is a new completion:
   - update daily_lesson_stats
   - update current_streak
   - update best_streak
   - update total_completed_days
6. If already completed, do not increment counters again

---

## 16. What Not To Build In V1

Do not build unless explicitly requested:

- Chat
- Comments
- Forum
- Courses
- Video
- Internal rich text editor
- Points system
- Ratings
- Groups
- Referral system
- “How many learned because of me”

---

## 17. Definition of Done

A step is done only when:

- Code compiles
- TypeScript passes
- No obvious security issue
- No unrelated files changed
- Core flow manually testable
- Edge cases handled
- Loading/error/empty state exists where relevant
