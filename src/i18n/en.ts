/**
 * English strings: the source of truth. Every key here must exist in ar.ts (the
 * type checker enforces it). Placeholders are {name}; a string that depends on a
 * number is an object of plural forms keyed by Intl.PluralRules categories
 * (English uses one/other; Arabic uses zero/one/two/few/many/other).
 */
export const en = {
  language: {
    label: 'Language',
    english: 'English',
    arabic: 'العربية',
    hint: 'Numbers and vital signs always use 0–9.',
  },
  rail: {
    mainNavigation: 'Main navigation',
    brand: 'Ismailia Health',
    brandSub: 'Connect',
    closeMenu: 'Close menu',
    waitingOnYou: 'Waiting on you',
    beds: 'Beds',
    referrals: 'Referrals',
    newReferral: 'New Referral',
    inbox: 'Inbox',
    bedManagement: 'Bed Management',
    directAdmit: 'Direct Admit',
    department: 'Department',
    reports: 'Reports',
    directory: 'Directory',
    archive: 'Archive',
    facilitySettings: 'Facility Settings',
    emergencyHotline: 'Emergency Hotline',
    endOfShift: 'End of shift',
    logOut: 'Log out',
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
    network: 'Network',
    offlineQueued: 'Offline · {count} queued',
    sendingQueued: 'Sending {count} queued…',
  },
} as const;
