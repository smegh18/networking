import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import { spacing } from '../../theme';

interface ConnectionButtonProps {
  onRequestB2B: () => void;
  onRequestOneOnOne: () => void;
  onViewSocials: () => void;
  onSaveContact: () => void;
}

export const ConnectionButton: React.FC<ConnectionButtonProps> = ({
  onRequestB2B,
  onRequestOneOnOne,
  onViewSocials,
  onSaveContact,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Button
          title="B2B Meeting"
          onPress={onRequestB2B}
          icon="briefcase-outline"
          variant="primary"
          size="sm"
          style={styles.button}
        />
        <Button
          title="1-on-1"
          onPress={onRequestOneOnOne}
          icon="person-outline"
          variant="outline"
          size="sm"
          style={styles.button}
        />
      </View>
      <View style={styles.row}>
        <Button
          title="Socials"
          onPress={onViewSocials}
          icon="share-social-outline"
          variant="secondary"
          size="sm"
          style={styles.button}
        />
        <Button
          title="Save Contact"
          onPress={onSaveContact}
          icon="person-add-outline"
          variant="ghost"
          size="sm"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
