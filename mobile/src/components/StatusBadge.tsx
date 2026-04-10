import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Severity, Verdict } from '../types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const backgroundColor =
    severity === 'high'
      ? theme.colors.primary
      : severity === 'medium'
        ? theme.colors.warning
        : theme.colors.success;

  const label =
    severity === 'high'
      ? 'ВЫСОКИЙ'
      : severity === 'medium'
        ? 'СРЕДНИЙ'
        : 'НИЗКИЙ';

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const backgroundColor =
    verdict === 'overpriced'
      ? theme.colors.primary
      : verdict === 'underpriced'
        ? theme.colors.warning
        : theme.colors.success;

  const label =
    verdict === 'fair'
      ? 'ЧЕСТНО'
      : verdict === 'overpriced'
        ? 'ЗАВЫШЕНО'
        : 'ЗАНИЖЕНО';

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  label: {
    color: '#0F0F0F',
    fontWeight: '800',
    fontSize: 12,
  },
});
