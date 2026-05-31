import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { Location, SocialLinks as SocialLinksType } from '../../types';
import { formatBusinessMapAddress, openWhatsApp, openInstagram, openFacebook, openLinkedIn, openGoogle, openGoogleMaps } from '../../utils/helpers';


interface SocialLinksProps {
  links: SocialLinksType;
  businessAddress?: string;
  businessArea?: string;
  location?: Partial<Location>;

}

const SOCIAL_CONFIG = [
  { key: 'instagram' as const, label: 'Instagram', icon: 'logo-instagram', color: '#E4405F', getUrl: openInstagram },
  { key: 'facebook' as const, label: 'Facebook', icon: 'logo-facebook', color: '#1877F2', getUrl: openFacebook },
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', getUrl: openWhatsApp },
  { key: 'linkedin' as const, label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2', getUrl: openLinkedIn },
  { key: 'google' as const, label: 'Google', icon: 'logo-google', color: '#4285F4', getUrl: openGoogle },
];

export const SocialLinks: React.FC<SocialLinksProps> = ({ links, businessAddress, businessArea, location }) => {

  const handlePress = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const activeLinks = SOCIAL_CONFIG.filter((s) => links[s.key]);
  const mapAddress = formatBusinessMapAddress(businessAddress, businessArea, location);

  if (activeLinks.length === 0 && !mapAddress) return null;


  return (
    <View style={styles.container}>
      {activeLinks.map((social) => (
        <TouchableOpacity
          key={social.key}
          style={[styles.button, { backgroundColor: social.color + '12' }]}
          onPress={() => handlePress(social.getUrl(links[social.key] || ''))}
          activeOpacity={0.7}
        >
          <Ionicons name={social.icon as any} size={22} color={social.color} />
          <Text style={[styles.label, { color: social.color }]}>{social.label}</Text>
        </TouchableOpacity>
      ))}
      {mapAddress ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#34A85312' }]}
          onPress={() => handlePress(openGoogleMaps(mapAddress))}

          activeOpacity={0.7}
        >
          <Ionicons name="location" size={22} color="#34A853" />
          <Text style={[styles.label, { color: '#34A853' }]}>Maps</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.bodySmallMedium,
  },
});
