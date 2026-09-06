import type { Language } from '@daily-learning/shared';

/**
 * Every user-facing string in the app, in both languages, resolved
 * through t(language) instead of scattered hardcoded Hebrew literals.
 * Both `he` and `en` are typed against the same AppStrings interface, so
 * TypeScript itself catches a screen added in one language and forgotten
 * in the other.
 *
 * Dynamic pieces (a count, a streak, a link) are functions instead of
 * plain strings so each language can order its words differently, not
 * just substitute a value into a fixed slot.
 */
export interface AppStrings {
  common: {
    error: string;
    ok: string;
    cancel: string;
    anonymous: string;
  };
  login: {
    title: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    missingFields: string;
    submit: string;
    noAccount: string;
  };
  register: {
    title: string;
    fullNamePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    trackLabel: string;
    trackMen: string;
    trackWomen: string;
    languageLabel: string;
    languageHebrew: string;
    languageEnglish: string;
    missingFields: string;
    submit: string;
    haveAccount: string;
    legalPrefix: string;
    termsOfUse: string;
    legalAnd: string;
    privacyPolicy: string;
  };
  about: {
    title: string;
    privacyPolicy: string;
    termsOfUse: string;
    accessibilityStatement: string;
    credit: string;
  };
  blocked: {
    title: string;
    subtitle: string;
    signOut: string;
  };
  paywall: {
    title: string;
    subtitle: string;
    pricesLoadError: (message: string) => string;
    monthlyPlanTitle: string;
    monthlyPlanPrice: (price: string) => string;
    yearlyPlanTitle: string;
    yearlyPlanPrice: (price: string) => string;
    checkoutErrorTitle: string;
    processingTitle: string;
    processingMessage: string;
    signOut: string;
  };
  dailyLesson: {
    prevDay: string;
    nextDay: string;
    calendarLink: string;
    shareLink: string;
    noLessonForDate: string;
    completeButton: string;
    completedButton: string;
    encouragementMessages: (streak?: number) => string[];
    dedicationsLinkWithCount: (count: number) => string;
    dedicationsLinkNone: string;
    aboutLink: string;
    signOut: string;
    credit: string;
    shareMessage: (link: string) => string;
  };
  renewalReminder: {
    endingTomorrow: string;
    endingInDays: (daysLeft: number) => string;
    renewNow: string;
  };
  myDedications: {
    title: string;
    newDedicationLink: string;
    emptyText: string;
    published: string;
    payNowButton: string;
    deleteButton: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteConfirmButton: string;
  };
  createDedication: {
    title: string;
    dateLabel: string;
    durationLabel: string;
    loadingOptions: string;
    noOptionsAvailable: string;
    typeLabel: string;
    textLabel: string;
    donorLabel: string;
    submitButton: string;
    missingText: string;
    missingDuration: string;
    savedMessage: string;
    payNowButton: string;
    myDedicationsLink: string;
  };
  recentDedications: {
    title: string;
    newDedicationLink: string;
    emptyText: string;
    donorPrefix: (name: string) => string;
  };
  calendar: {
    weekdayLabels: string[];
    monthLabels: string[];
    legendCompleted: string;
    legendMissed: string;
    legendNoLesson: string;
  };
  notificationSettings: {
    title: string;
    enableLabel: string;
    timeLabel: string;
    savedText: string;
    saveButton: string;
    genericSaveError: string;
  };
  payment: {
    missingDetails: string;
    headerTitle: string;
    cancel: string;
    payButton: string;
    paymentNotCompleted: string;
    confirming: string;
    success: string;
    timeoutMessage: string;
    backToHome: string;
  };
  paymentNativeFallback: {
    title: string;
    body: string;
    back: string;
  };
  home: {
    profileLoadError: string;
  };
  dedicationTypes: {
    memory: string;
    healing: string;
    success: string;
    marriage: string;
    thanks: string;
    other: string;
  };
  paymentStatus: {
    pending: string;
    paid: string;
    failed: string;
    refunded: string;
  };
  approvalStatus: {
    pending: string;
    approved: string;
    rejected: string;
    hidden: string;
  };
}

const encouragementBase = {
  he: ['כל הכבוד! עוד יום של לימוד.', 'המשכת היום, זה מה שבונה התמדה.'],
  en: ['Well done! Another day of learning.', "You showed up today — that's what builds consistency."],
};

const he: AppStrings = {
  common: {
    error: 'שגיאה',
    ok: 'אישור',
    cancel: 'ביטול',
    anonymous: 'אנונימי',
  },
  login: {
    title: 'התחברות',
    emailPlaceholder: 'אימייל',
    passwordPlaceholder: 'סיסמה',
    missingFields: 'נא למלא אימייל וסיסמה.',
    submit: 'התחבר/י',
    noAccount: 'אין לך חשבון? הרשמ/י כאן',
  },
  register: {
    title: 'הרשמה',
    fullNamePlaceholder: 'שם מלא',
    phonePlaceholder: 'טלפון',
    emailPlaceholder: 'אימייל',
    passwordPlaceholder: 'סיסמה',
    trackLabel: 'מסלול',
    trackMen: 'גברים',
    trackWomen: 'נשים',
    languageLabel: 'שפה',
    languageHebrew: 'עברית',
    languageEnglish: 'English',
    missingFields: 'נא למלא את כל השדות.',
    submit: 'הרשמ/י',
    haveAccount: 'כבר יש לך חשבון? התחבר/י',
    legalPrefix: 'בהרשמה אני מסכים/ה ל ',
    termsOfUse: 'תנאי השימוש',
    legalAnd: ' ול ',
    privacyPolicy: 'מדיניות הפרטיות',
  },
  about: {
    title: 'אודות ומידע משפטי',
    privacyPolicy: 'מדיניות פרטיות',
    termsOfUse: 'תנאי שימוש',
    accessibilityStatement: 'הצהרת נגישות',
    credit: 'נבנה ע"י דניאל לחמיש',
  },
  blocked: {
    title: 'החשבון שלך חסום',
    subtitle: 'לפרטים נוספים יש לפנות לתמיכה.',
    signOut: 'התנתק/י',
  },
  paywall: {
    title: 'בחר/י מנוי',
    subtitle: 'לצפייה רציפה בלימוד היומי.',
    pricesLoadError: (message) => `שגיאה בטעינת המחירים: ${message}`,
    monthlyPlanTitle: 'מנוי חודשי',
    monthlyPlanPrice: (price) => `₪${price} / חודש`,
    yearlyPlanTitle: 'מנוי שנתי',
    yearlyPlanPrice: (price) => `₪${price} / שנה`,
    checkoutErrorTitle: 'שגיאה',
    processingTitle: 'התשלום בעיבוד',
    processingMessage:
      'אם התשלום הצליח, הגישה תיפתח בעוד רגע. אפשר לחזור למסך הראשי ולנסות שוב אם התוכן עדיין חסום.',
    signOut: 'התנתק/י',
  },
  dailyLesson: {
    prevDay: '‹ אתמול',
    nextDay: 'מחר ›',
    calendarLink: 'לוח שנה',
    shareLink: 'שיתוף',
    noLessonForDate: 'לא קיים לימוד לתאריך זה.',
    completeButton: 'סיימתי',
    completedButton: 'הושלם',
    encouragementMessages: (streak) => [
      encouragementBase.he[0],
      ...(streak ? [`רצף של ${streak} ימים — מדהים!`] : []),
      encouragementBase.he[1],
    ],
    dedicationsLinkWithCount: (count) => `היום מוקדש על ידי ${count} מקדישים`,
    dedicationsLinkNone: 'הקדש/י את הלימוד היום',
    aboutLink: 'אודות ומידע משפטי',
    signOut: 'התנתק/י',
    credit: 'נבנה ע"י דניאל לחמיש',
    shareMessage: (link) => `הצטרפו אליי ללימוד היומי! 📖\n${link}`,
  },
  renewalReminder: {
    endingTomorrow: 'המנוי השנתי שלך מסתיים מחר!',
    endingInDays: (daysLeft) => `המנוי השנתי שלך מסתיים בעוד ${daysLeft} ימים.`,
    renewNow: 'חדש/י עכשיו ›',
  },
  myDedications: {
    title: 'ההקדשות שלי',
    newDedicationLink: '+ הקדשה חדשה',
    emptyText: 'עדיין אין לך הקדשות.',
    published: 'פורסם',
    payNowButton: 'שלם/י עכשיו',
    deleteButton: 'מחק/י',
    deleteConfirmTitle: 'מחיקת הקדשה',
    deleteConfirmMessage: 'למחוק את ההקדשה הזו? לא ניתן לשחזר.',
    deleteConfirmButton: 'מחק/י',
  },
  createDedication: {
    title: 'הקדשת לימוד',
    dateLabel: 'תאריך ההקדשה',
    durationLabel: 'למשך כמה זמן',
    loadingOptions: 'טוען אפשרויות…',
    noOptionsAvailable: 'אין כרגע אפשרויות הקדשה זמינות.',
    typeLabel: 'סוג ההקדשה',
    textLabel: 'נוסח ההקדשה',
    donorLabel: 'שם המקדיש (אופציונלי)',
    submitButton: 'הקדש/י',
    missingText: 'נא להזין נוסח הקדשה.',
    missingDuration: 'נא לבחור למשך כמה זמן ההקדשה.',
    savedMessage: 'ההקדשה נשמרה! היא תופיע לאחר תשלום ואישור מנהל.',
    payNowButton: 'שלם/י עכשיו',
    myDedicationsLink: 'ההקדשות שלי',
  },
  recentDedications: {
    title: 'הקדשות אחרונות',
    newDedicationLink: '+ הקדש/י',
    emptyText: 'עדיין אין הקדשות מאושרות.',
    donorPrefix: (name) => `מאת: ${name}`,
  },
  calendar: {
    weekdayLabels: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    monthLabels: [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
    ],
    legendCompleted: 'הושלם',
    legendMissed: 'הוחסר',
    legendNoLesson: 'אין לימוד',
  },
  notificationSettings: {
    title: 'תזכורת יומית',
    enableLabel: 'הפעלת תזכורת',
    timeLabel: 'שעת תזכורת',
    savedText: 'ההגדרות נשמרו.',
    saveButton: 'שמור',
    genericSaveError: 'אירעה שגיאה בשמירת ההגדרות.',
  },
  payment: {
    missingDetails: 'חסרים פרטי תשלום. יש לחזור ולנסות שוב.',
    headerTitle: 'תשלום מאובטח',
    cancel: 'ביטול',
    payButton: 'בצע תשלום',
    paymentNotCompleted: 'התשלום לא הושלם.',
    confirming: 'מוודא מול חברת הסליקה שהתשלום התקבל…',
    success: 'התשלום התקבל בהצלחה! 🎉',
    timeoutMessage: 'עדיין מעבדים את התשלום — זה יכול לקחת כמה דקות. אפשר לחזור למסך הראשי ולבדוק שוב בהמשך.',
    backToHome: 'חזרה למסך הראשי',
  },
  paymentNativeFallback: {
    title: 'התשלום זמין כרגע בגרסת האתר',
    body: 'כדי להשלים את התשלום, יש להיכנס לאפליקציה דרך הדפדפן (אותה כתובת בה נרשמת).',
    back: 'חזרה',
  },
  home: {
    profileLoadError: 'לא הצלחנו לטעון את הפרופיל שלך. נסה/י להתחבר מחדש.',
  },
  dedicationTypes: {
    memory: 'לעילוי נשמת',
    healing: 'לרפואה',
    success: 'להצלחה',
    marriage: 'לזיווג',
    thanks: 'הודיה',
    other: 'אחר',
  },
  paymentStatus: {
    pending: 'ממתין לתשלום',
    paid: 'שולם',
    failed: 'נכשל',
    refunded: 'הוחזר',
  },
  approvalStatus: {
    pending: 'ממתין לאישור',
    approved: 'מאושר',
    rejected: 'נדחה',
    hidden: 'מוסתר',
  },
};

const en: AppStrings = {
  common: {
    error: 'Error',
    ok: 'OK',
    cancel: 'Cancel',
    anonymous: 'Anonymous',
  },
  login: {
    title: 'Log in',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    missingFields: 'Please enter an email and password.',
    submit: 'Log in',
    noAccount: "Don't have an account? Sign up",
  },
  register: {
    title: 'Sign up',
    fullNamePlaceholder: 'Full name',
    phonePlaceholder: 'Phone',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    trackLabel: 'Track',
    trackMen: 'Men',
    trackWomen: 'Women',
    languageLabel: 'Language',
    languageHebrew: 'עברית',
    languageEnglish: 'English',
    missingFields: 'Please fill in all fields.',
    submit: 'Sign up',
    haveAccount: 'Already have an account? Log in',
    legalPrefix: 'By signing up you agree to the ',
    termsOfUse: 'Terms of use',
    legalAnd: ' and the ',
    privacyPolicy: 'Privacy policy',
  },
  about: {
    title: 'About and legal',
    privacyPolicy: 'Privacy policy',
    termsOfUse: 'Terms of use',
    accessibilityStatement: 'Accessibility statement',
    credit: 'Built by Daniel Achmish',
  },
  blocked: {
    title: 'Your account is blocked',
    subtitle: 'Please contact support for more details.',
    signOut: 'Sign out',
  },
  paywall: {
    title: 'Choose a subscription',
    subtitle: 'For uninterrupted access to the daily lesson.',
    pricesLoadError: (message) => `Error loading prices: ${message}`,
    monthlyPlanTitle: 'Monthly subscription',
    monthlyPlanPrice: (price) => `₪${price} / month`,
    yearlyPlanTitle: 'Yearly subscription',
    yearlyPlanPrice: (price) => `₪${price} / year`,
    checkoutErrorTitle: 'Error',
    processingTitle: 'Payment processing',
    processingMessage:
      "If the payment succeeded, access will open in a moment. You can go back to the main screen and try again if the content is still locked.",
    signOut: 'Sign out',
  },
  dailyLesson: {
    prevDay: '‹ Prev',
    nextDay: 'Next ›',
    calendarLink: 'Calendar',
    shareLink: 'Share',
    noLessonForDate: 'No lesson exists for this date.',
    completeButton: 'Mark complete',
    completedButton: 'Completed',
    encouragementMessages: (streak) => [
      encouragementBase.en[0],
      ...(streak ? [`A streak of ${streak} days — amazing!`] : []),
      encouragementBase.en[1],
    ],
    dedicationsLinkWithCount: (count) => `Today is dedicated by ${count} people`,
    dedicationsLinkNone: "Dedicate today's lesson",
    aboutLink: 'About and legal',
    signOut: 'Sign out',
    credit: 'Built by Daniel Achmish',
    shareMessage: (link) => `Join me for the daily lesson! 📖\n${link}`,
  },
  renewalReminder: {
    endingTomorrow: 'Your yearly subscription ends tomorrow!',
    endingInDays: (daysLeft) => `Your yearly subscription ends in ${daysLeft} days.`,
    renewNow: 'Renew now ›',
  },
  myDedications: {
    title: 'My dedications',
    newDedicationLink: '+ New dedication',
    emptyText: "You don't have any dedications yet.",
    published: 'Published',
    payNowButton: 'Pay now',
    deleteButton: 'Delete',
    deleteConfirmTitle: 'Delete dedication',
    deleteConfirmMessage: 'Delete this dedication? This cannot be undone.',
    deleteConfirmButton: 'Delete',
  },
  createDedication: {
    title: 'Dedicate a lesson',
    dateLabel: 'Dedication date',
    durationLabel: 'For how long',
    loadingOptions: 'Loading options…',
    noOptionsAvailable: 'No dedication options are available right now.',
    typeLabel: 'Dedication type',
    textLabel: 'Dedication text',
    donorLabel: 'Donor name (optional)',
    submitButton: 'Dedicate',
    missingText: 'Please enter the dedication text.',
    missingDuration: 'Please choose how long the dedication should run.',
    savedMessage: 'The dedication was saved! It will appear once paid and approved.',
    payNowButton: 'Pay now',
    myDedicationsLink: 'My dedications',
  },
  recentDedications: {
    title: 'Recent dedications',
    newDedicationLink: '+ Dedicate',
    emptyText: 'No approved dedications yet.',
    donorPrefix: (name) => `From: ${name}`,
  },
  calendar: {
    weekdayLabels: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    monthLabels: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    legendCompleted: 'Completed',
    legendMissed: 'Missed',
    legendNoLesson: 'No lesson',
  },
  notificationSettings: {
    title: 'Daily reminder',
    enableLabel: 'Enable reminder',
    timeLabel: 'Reminder time',
    savedText: 'Settings saved.',
    saveButton: 'Save',
    genericSaveError: 'Something went wrong saving the settings.',
  },
  payment: {
    missingDetails: 'Payment details are missing. Please go back and try again.',
    headerTitle: 'Secure payment',
    cancel: 'Cancel',
    payButton: 'Pay',
    paymentNotCompleted: 'The payment was not completed.',
    confirming: 'Confirming with the payment processor that the payment went through…',
    success: 'Payment received! 🎉',
    timeoutMessage:
      "The payment is still being processed — this can take a few minutes. You can go back to the main screen and check again later.",
    backToHome: 'Back to the main screen',
  },
  paymentNativeFallback: {
    title: 'Payment is currently available on the website version',
    body: 'To complete the payment, open the app in your browser (the same address you signed up at).',
    back: 'Back',
  },
  home: {
    profileLoadError: "We couldn't load your profile. Please try logging in again.",
  },
  dedicationTypes: {
    memory: 'In memory of',
    healing: 'For healing',
    success: 'For success',
    marriage: 'For a match',
    thanks: 'In gratitude',
    other: 'Other',
  },
  paymentStatus: {
    pending: 'Payment pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  },
  approvalStatus: {
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
    hidden: 'Hidden',
  },
};

const DICTIONARIES: Record<Language, AppStrings> = { he, en };

export function t(language: Language): AppStrings {
  return DICTIONARIES[language];
}
