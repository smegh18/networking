import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns';

export const formatDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM dd, yyyy');
};

export const formatTime = (timeStr: string): string => {
  return timeStr;
};

export const formatDateTime = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'MMM dd, yyyy • hh:mm a');
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const daysUntilBirthday = (dobStr: string): number => {
  const dob = parseISO(dobStr);
  const today = new Date();
  const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  return differenceInDays(nextBirthday, today);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

export const openWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}`;
};

/** WhatsApp URL with pre-filled message. Phone can be 10-digit (assumes India +91) or with country code. */
export const openWhatsAppWithMessage = (phone: string, text: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
};

/** WhatsApp share URL without a fixed recipient. */
export const shareToWhatsApp = (text: string): string => {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

/** Deep link to open an event in the app (scheme from app.json). */
export const getEventDeepLink = (eventId: string): string => {
  return `netconnect://event/${eventId}`;
};

/** Public link to open the event page on web (and deep-link into the app when supported). */
export const getEventShareLink = (eventId: string): string => {
  // Hosted web app base. This must match your Firebase Hosting site.
  return `https://bbcn-networking.web.app/event/${eventId}`;
};

export const openInstagram = (username: string): string => {
  return `https://instagram.com/${username}`;
};

export const openFacebook = (url: string): string => {
  return url.startsWith('http') ? url : `https://facebook.com/${url}`;
};

export const openLinkedIn = (url: string): string => {
  return url.startsWith('http') ? url : `https://linkedin.com/in/${url}`;
};

export const openGoogle = (url: string): string => {
  return url.startsWith('http') ? url : `https://${url}`;
};

export const openGoogleMaps = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};
