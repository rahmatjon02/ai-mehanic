import { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export function GradientCard({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <LinearGradient
      colors={['#1C1C28', '#13131A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
});
