# Architecture.md — ארכיטקטורת מערכת

## 1. עיקרון מרכזי

המערכת תיבנה כ־Production Ready V1, לא כפרוטוטייפ.

היעד הוא אפליקציה לאנדרואיד ולאייפון עם יכולת לשרת עשרות אלפי משתמשים רשומים, כולל מנויים, לימוד יומי בתמונות, רצף לימוד, הקדשות ופאנל ניהול.

---

## 2. טכנולוגיות מומלצות

### Mobile App

- React Native
- Expo
- TypeScript
- Expo Router
- React Query / TanStack Query
- Zustand או Context מינימלי לניהול state
- expo-notifications לתזכורת יומית מקומית

### Admin Panel

- Next.js
- TypeScript
- React
- TailwindCSS
- TanStack Query
- Supabase client

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Row Level Security

### Payments

- ספק סליקה חיצוני בלבד
- Stripe או ספק ישראלי שתומך ב־API ו־Webhooks
- אין לבנות סליקה עצמאית
- אין לעדכן סטטוס תשלום מצד לקוח

---

## 3. מבנה פרויקט מומלץ

```txt
root/
  apps/
    mobile/
      app/
      src/
        components/
        screens/
        features/
        services/
        hooks/
        types/
        utils/
        constants/
    admin/
      src/
        app/
        components/
        features/
        services/
        types/
        utils/
  packages/
    shared/
      types/
      constants/
      validation/
  supabase/
    migrations/
    functions/
      payment-webhook/
      create-checkout-session/
      admin-actions/
  docs/
    00_Product_Spec.md
    01_Architecture.md
    02_Database.md
    03_BuildPlan.md
    04_ClaudeRules.md
    05_Prompts.md
```

---

## 4. חלוקת אחריות

### Mobile App אחראי על:

- הרשמה והתחברות
- בחירת מסלול ושפה
- הצגת לימוד יומי
- לוח שנה
- סימון סיימתי
- הצגת רצף
- יצירת הקדשה
- צפייה בהקדשות
- פרופיל
- תזכורת יומית
- שיתוף

### Admin Panel אחראי על:

- ניהול משתמשים
- ניהול מנויים
- יצירה ועריכת לימודים
- העלאת תמונות
- אישור הקדשות
- מחירי הקדשות
- דוחות

### Supabase אחראי על:

- Auth
- DB
- Storage
- RLS
- Edge Functions
- Webhooks
- פעולות רגישות

---

## 5. עקרונות ביצועים

המערכת מיועדת לעשרות אלפי רשומים ולכן חובה:

- pagination בכל טבלה גדולה
- limit בכל שאילתה
- filters לפי תאריך, שפה, מסלול וסטטוס
- אינדקסים לכל עמודה שמחפשים לפיה
- counters לטבלאות סטטיסטיקה
- לא לבצע count כבד בכל טעינת מסך
- לא לשלוף את כל ההקדשות של כל הזמנים
- לא לשלוף את כל המשתמשים
- לא לשלוף תמונות לא רלוונטיות
- caching בצד לקוח לנתונים שלא משתנים הרבה

---

## 6. עקרונות אבטחה

- RLS חובה בכל טבלה רגישה
- משתמש רואה רק את המידע שלו
- משתמש רואה רק לימודים published
- משתמש רואה רק לימודים שמתאימים למסלול ולשפה שלו
- משתמש רואה תוכן רק אם יש לו מנוי פעיל או free_access
- מנהל מזוהה לפי role=admin
- פעולות מנהל מוגנות גם בצד client וגם ב־RLS
- payment_status מתעדכן רק מ־webhook מאומת
- approval_status של הקדשות מתעדכן רק על ידי מנהל

---

## 7. זרימת משתמש

1. משתמש פותח אפליקציה
2. אם לא מחובר — עובר להתחברות/הרשמה
3. לאחר התחברות נטען profile
4. נבדק access_status
5. אם אין מנוי ואין free_access — מוצג paywall
6. אם יש גישה — מוצג לימוד יומי
7. המשתמש יכול לסמן סיימתי
8. המערכת מעדכנת progress, streak ו־daily stats

---

## 8. זרימת מנהל

1. מנהל נכנס לפאנל ניהול
2. מתבצע אימות role=admin
3. מוצג דשבורד
4. מנהל יכול ליצור לימוד
5. מעלה תמונות ל־Storage
6. שומר lesson_images עם sort_order
7. מפרסם את הלימוד
8. משתמשים מתאימים רואים אותו באפליקציה

---

## 9. זרימת הקדשה

1. משתמש בוחר תאריך
2. בוחר סוג הקדשה
3. מזין נוסח
4. נוצרה הקדשה בסטטוס payment_status=pending ו־approval_status=pending
5. המשתמש מועבר לתשלום
6. webhook מעדכן payment_status=paid
7. מנהל מאשר את ההקדשה
8. רק הקדשות paid + approved מוצגות למשתמשים

---

## 10. זרימת מנוי

1. משתמש בוחר חודשי או שנתי
2. נפתחת checkout session דרך Edge Function
3. המשתמש משלם אצל ספק הסליקה
4. webhook מאומת מעדכן subscriptions
5. האפליקציה קוראת מחדש את access_status
6. אם המנוי פעיל — התוכן נפתח

---

## 11. Offline / טעינה

ב־V1 לא נדרש מצב Offline מלא.

כן נדרש:

- loading states
- error states
- retry
- cache בסיסי של לימוד נוכחי
- תמונות עם placeholder

---

## 12. RTL/LTR

עברית:

- RTL מלא
- יישור לימין
- ניווט מותאם

אנגלית:

- LTR מלא
- יישור לשמאל

חובה לתכנן את ה־UI כך שלא יהיה hardcoded לימין בלבד.

---

## 13. החלטות שחשוב לא לשנות בלי אישור

- Mobile: React Native + Expo
- Admin: Next.js
- Backend: Supabase
- DB: PostgreSQL
- Storage: Supabase Storage
- Auth: Supabase Auth
- Payments: external provider with webhooks only
- TypeScript only
- No `any`
- No heavy live counts
- No fetching entire tables
