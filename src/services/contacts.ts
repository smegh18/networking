import * as Contacts from 'expo-contacts';
import { Alert, Linking, Platform } from 'react-native';
import type { User } from '../types';

// ---------------------------------------------------------------------------
// Permission Helper
// ---------------------------------------------------------------------------

/**
 * Request write permission for the device contacts.
 * Returns `true` if permission was granted.
 *
 * On iOS, this requests the broader Contacts permission (there is
 * no separate read/write split). On Android, WRITE_CONTACTS is
 * requested.
 */
async function ensureContactPermission(): Promise<boolean> {
  const { status: existingStatus } = await Contacts.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  const { status } = await Contacts.requestPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Contacts permission is needed to save this contact. ' +
        'You can enable it in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
    );
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a NetConnect user's information as a new device contact.
 *
 * The contact will include:
 * - First & last name (split from `user.name`)
 * - Phone number
 * - Email address
 * - Company / business name
 * - Job title (business category)
 * - Social profile URLs (LinkedIn, Instagram, Facebook)
 * - Note with business description
 *
 * @param user  The User object whose details should be saved.
 * @returns     The ID of the newly created contact, or `null`
 *              if the operation was cancelled or failed.
 */
export async function saveToContacts(user: User): Promise<string | null> {
  const hasPermission = await ensureContactPermission();
  if (!hasPermission) return null;

  // Split the full name into first and last name
  const nameParts = user.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Build the contact object
  const contact: Contacts.Contact = {
    contactType: Contacts.ContactTypes.Person,
    firstName,
    lastName,
    name: user.name,
    company: user.businessName || undefined,
    jobTitle: user.businessCategory || undefined,
    phoneNumbers: user.phone
      ? [
          {
            label: 'mobile',
            number: user.phone,
          },
        ]
      : undefined,
    emails: user.email
      ? [
          {
            label: 'work',
            email: user.email,
          },
        ]
      : undefined,
    urlAddresses: buildUrlAddresses(user),
    note: user.businessDescription || undefined,
  };

  try {
    const contactId = await Contacts.addContactAsync(contact);
    return contactId;
  } catch (error) {
    console.error('Failed to save contact:', error);
    throw new Error(
      'Could not save the contact. Please try again or check your permissions.',
    );
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Build URL addresses array from the user's social links.
 * Only includes links that are non-empty.
 */
function buildUrlAddresses(
  user: User,
): Contacts.UrlAddress[] | undefined {
  const urls: Contacts.UrlAddress[] = [];

  if (user.socialLinks?.linkedin) {
    urls.push({ label: 'LinkedIn', url: user.socialLinks.linkedin });
  }
  if (user.socialLinks?.instagram) {
    urls.push({ label: 'Instagram', url: user.socialLinks.instagram });
  }
  if (user.socialLinks?.facebook) {
    urls.push({ label: 'Facebook', url: user.socialLinks.facebook });
  }
  if (user.socialLinks?.whatsapp) {
    urls.push({
      label: 'WhatsApp',
      url: `https://wa.me/${user.socialLinks.whatsapp.replace(/\D/g, '')}`,
    });
  }

  return urls.length > 0 ? urls : undefined;
}
