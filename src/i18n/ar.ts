import type { Messages } from './index';

/**
 * Arabic drafts (Egyptian medical usage, Modern Standard Arabic register).
 * NOT YET REVIEWED: a native-speaking clinician signs these off before a pilot;
 * `npm run i18n:sheet` writes the review sheet.
 */
export const ar: Messages = {
  language: {
    label: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    hint: 'الأرقام والعلامات الحيوية تُكتب دائمًا بالأرقام 0–9.',
  },
  rail: {
    mainNavigation: 'التنقل الرئيسي',
    brand: 'صحة الإسماعيلية',
    brandSub: 'كونكت',
    closeMenu: 'إغلاق القائمة',
    waitingOnYou: 'في انتظارك',
    beds: 'الأسرّة',
    referrals: 'الإحالات',
    newReferral: 'إحالة جديدة',
    inbox: 'الوارد',
    bedManagement: 'إدارة الأسرّة',
    directAdmit: 'دخول مباشر',
    department: 'القسم',
    reports: 'التقارير',
    directory: 'الدليل',
    archive: 'الأرشيف',
    facilitySettings: 'إعدادات المنشأة',
    emergencyHotline: 'الخط الساخن للطوارئ',
    endOfShift: 'نهاية المناوبة',
    logOut: 'تسجيل الخروج',
    toDark: 'التبديل إلى الوضع الداكن',
    toLight: 'التبديل إلى الوضع الفاتح',
    network: 'الشبكة',
    offlineQueued: 'غير متصل · {count} في الانتظار',
    sendingQueued: 'جارٍ إرسال {count} في الانتظار…',
  },
};
