# BuildPlan.md — תוכנית בנייה לפי שלבים

## עיקרון עבודה

לא בונים הכול במכה.

כל שלב חייב להיות קטן, ברור, ניתן לבדיקה, וללא שינוי קבצים לא קשורים.

כל שלב מסתיים רק אחרי:

- קוד עובד
- בדיקות בסיסיות
- אין שגיאות TypeScript
- אין שגיאות lint
- הוסבר איך לבדוק

---

## שלב 0 — הקמת Monorepo

### מטרה

להקים מבנה פרויקט נקי ומוכן לעבודה.

### משימות

- ליצור monorepo
- ליצור apps/mobile
- ליצור apps/admin
- ליצור packages/shared
- ליצור supabase/migrations
- ליצור supabase/functions
- להגדיר TypeScript
- להגדיר env examples
- להגדיר README בסיסי

### אין לבנות בשלב זה

- מסכים אמיתיים
- DB מלא
- תשלומים
- אדמין אמיתי

### בדיקות

- mobile app עולה
- admin app עולה
- TypeScript תקין

---

## שלב 1 — Supabase בסיסי ו־DB

### מטרה

להקים בסיס נתונים production-ready.

### משימות

- ליצור migrations
- ליצור טבלאות:
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
- ליצור indexes
- להפעיל RLS
- ליצור helper functions:
  - is_admin
  - has_active_access
- ליצור seed בסיסי ל־settings

### בדיקות

- migrations רצות ללא שגיאות
- קיימים indexes
- RLS מופעל

---

## שלב 2 — Auth + Profiles

### מטרה

משתמש יכול להירשם, להתחבר, וליצור פרופיל.

### Mobile

- מסך פתיחה
- הרשמה
- התחברות
- יצירת profile לאחר הרשמה
- שמירת full_name, phone, email, gender_track, language

### Admin

- עדיין לא נדרש

### Backend

- trigger או flow ליצירת profile
- session handling

### בדיקות

- משתמש נרשם
- משתמש מתחבר
- profile נוצר
- profile נטען באפליקציה

---

## שלב 3 — Access Control / Paywall

### מטרה

לחסום תוכן למי שאין לו מנוי או גישה חינמית.

### משימות

- לבנות פונקציית בדיקת גישה
- לבנות מסך Paywall
- להציג תוכן רק למשתמש עם:
  - subscription active
  - או free_access=true
- אם account_status=blocked לחסום כניסה

### בדיקות

- משתמש ללא מנוי רואה Paywall
- משתמש עם free_access רואה תוכן
- משתמש blocked לא רואה תוכן

---

## שלב 4 — Lessons Mobile

### מטרה

הצגת לימוד יומי באפליקציה.

### משימות

- service לשליפת לימוד לפי תאריך
- התאמה לפי gender_track + language
- הצגת title
- הצגת hebrew_date + lesson_date
- הצגת תמונות לפי sort_order
- מעבר ליום קודם / הבא
- מצב אין לימוד
- loading/error states

### בדיקות

- משתמש רואה רק לימוד שמתאים לו
- משתמש לא רואה טיוטה
- יום ללא לימוד מציג הודעה
- תמונות מוצגות לפי הסדר

---

## שלב 5 — Admin בסיסי

### מטרה

מנהל יכול להיכנס לפאנל ניהול.

### משימות

- login למנהל
- בדיקת role=admin
- dashboard shell
- navigation:
  - Dashboard
  - Users
  - Subscriptions
  - Lessons
  - Dedications
  - Settings
  - Reports

### בדיקות

- user רגיל לא נכנס לאדמין
- admin נכנס

---

## שלב 6 — Admin Lessons

### מטרה

מנהל יכול ליצור ולנהל לימודים.

### משימות

- רשימת לימודים עם pagination
- סינון לפי תאריך, מסלול, שפה, סטטוס
- יצירת לימוד
- עריכת לימוד
- העלאת תמונות ל־Storage
- שמירת lesson_images
- סידור תמונות sort_order
- מחיקת תמונה
- פרסום / טיוטה
- שכפול לימוד

### בדיקות

- יצירת לימוד חדש
- מניעת כפילות על אותו תאריך+מסלול+שפה
- העלאת 1/2/10 תמונות
- שינוי סדר תמונות
- פרסום לימוד והופעתו באפליקציה

---

## שלב 7 — Complete Lesson + Streak

### מטרה

משתמש מסמן “סיימתי” והרצף מתעדכן.

### משימות

- לבנות RPC/Edge Function complete_lesson
- insert ל־learning_progress עם unique protection
- מניעת ספירה כפולה
- עדכון daily_lesson_stats
- עדכון current_streak
- עדכון best_streak
- עדכון total_completed_days
- UI לכפתור סיימתי/הושלם
- הודעות עידוד

### בדיקות

- לחיצה ראשונה סופרת
- לחיצה שנייה לא סופרת
- daily_lesson_stats מתעדכן פעם אחת
- הרצף מתעדכן נכון

---

## שלב 8 — Calendar

### מטרה

לוח שנה חודשי עם סימוני השלמה.

### משימות

- שליפת progress לפי חודש
- שליפת lessons קיימים לפי חודש, מסלול ושפה
- סימון ימים:
  - completed
  - missed
  - no lesson
  - today
- לחיצה על יום פותחת לימוד

### בדיקות

- חודש נטען מהר
- לא נשלפים נתונים מיותרים
- סימונים נכונים

---

## שלב 9 — Dedications User

### מטרה

משתמש יכול ליצור הקדשה ולראות הקדשות.

### משימות

- מסך יצירת הקדשה
- בחירת תאריך
- בחירת סוג
- נוסח הקדשה
- donor_name אופציונלי
- קריאת מחיר מ־settings
- יצירת dedication בסטטוס pending
- מסך ההקדשות שלי
- מסך הקדשות היום
- הצגת רק paid + approved

### בדיקות

- יצירת הקדשה
- הקדשה לא מופיעה לפני אישור
- הקדשה מופיעה אחרי paid+approved

---

## שלב 10 — Admin Dedications

### מטרה

מנהל יכול לאשר, לדחות ולערוך הקדשות.

### משימות

- טבלת הקדשות עם pagination
- סינון לפי תאריך
- סינון לפי status
- צפייה בפרטים
- אישור
- דחייה
- הסתרה
- עריכת נוסח

### בדיקות

- מנהל מאשר הקדשה
- משתמש רואה רק מאושרות ומשולמות
- user רגיל לא יכול לאשר

---

## שלב 11 — Payments

### מטרה

חיבור תשלומים אמיתי דרך ספק חיצוני.

### משימות

- create checkout session למנוי
- create checkout session להקדשה
- payment webhook מאומת
- עדכון subscriptions
- עדכון payments
- עדכון dedications.payment_status
- עדכון daily_revenue_stats

### בדיקות

- תשלום מנוי מוצלח פותח תוכן
- תשלום נכשל לא פותח תוכן
- תשלום הקדשה מוצלח מעביר ל־paid
- רק webhook מעדכן סטטוס תשלום

---

## שלב 12 — Admin Users & Subscriptions

### מטרה

מנהל יכול לנהל משתמשים ומנויים.

### משימות

- רשימת משתמשים עם pagination
- חיפוש לפי שם/טלפון/אימייל
- שינוי שפה/מסלול
- free_access on/off
- חסימת משתמש
- צפייה במנויים
- הארכת מנוי ידנית
- ביטול מנוי ידני

### בדיקות

- חיפוש עובד מהר
- שינוי free_access משפיע על גישה
- חסימה מונעת תוכן

---

## שלב 13 — Reports & Dashboard

### מטרה

דוחות מנהל בלי שאילתות כבדות.

### משימות

- דשבורד:
  - סך משתמשים
  - מנויים פעילים
  - למדו היום
  - למדו השבוע
  - למדו החודש
  - הקדשות היום
  - הקדשות החודש
  - הכנסות
- להשתמש ב־daily_lesson_stats ו־daily_revenue_stats
- לא להריץ count כבד על כל טעינה

### בדיקות

- דשבורד נטען מהר
- הנתונים תואמים ל־stats tables

---

## שלב 14 — Notifications & Sharing

### מטרה

תזכורות ושיתוף בסיסיים.

### משימות

- notification_settings
- הפעל/כבה תזכורת
- בחירת שעה
- Local Notification יומית
- כפתור שיתוף

### בדיקות

- תזכורת נשמרת
- תזכורת מופעלת מקומית
- שיתוף עובד באנדרואיד ובאייפון

---

## שלב 15 — Polish & Release Prep

### מטרה

ליטוש לפני העלאה לחנויות.

### משימות

- RTL/LTR מלא
- loading states
- error states
- empty states
- בדיקות מכשירים
- אופטימיזציית תמונות
- privacy policy links
- terms links
- app icons
- splash screen
- build Android
- build iOS

### בדיקות

- Android build תקין
- iOS build תקין
- אין שגיאות קריטיות
- משתמש אמיתי יכול לבצע flow מלא

---

## סדר עדיפויות אם יש לחץ זמן

לא לוותר:

- Auth
- מנויים
- חסימת תוכן
- לימוד יומי
- Admin לימודים
- סיימתי
- לוח שנה
- הקדשות
- אישור הקדשות

אפשר לדחות:

- דוחות מתקדמים
- היסטוריית תשלומים מפורטת
- Push שרת
- שיתוף מתקדם
- אנימציות מורכבות
