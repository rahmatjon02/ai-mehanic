import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { useObd } from '../context/obd-context';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { ObdScanResult, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OBD'>;

const SEVERITY_COLOR: Record<string, string> = {
  high: theme.colors.danger,
  medium: theme.colors.warning,
  low: theme.colors.success,
  none: theme.colors.success,
};

export function OBDScreen({ navigation }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ObdScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { saveReading } = useObd();

  async function handleScan() {
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const data = await apiService.scanObd();
      setResult(data);
      if (data.codes.length > 0) {
        saveReading({ codes: data.codes, diagnosisBoost: data.diagnosisBoost, confidenceBoost: data.confidenceBoost });
      }
    } catch (e: any) {
      setError(e.message ?? 'Ошибка сканирования');
    } finally {
      setScanning(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientCard style={styles.heroCard}>
        <Ionicons name="scan-outline" size={40} color={theme.colors.primary} />
        <Text style={styles.title}>OBD Диагностика</Text>
        <Text style={styles.subtitle}>Считайте коды ошибок с вашего автомобиля</Text>
      </GradientCard>

      {!result && !scanning && (
        <Pressable style={styles.primaryButton} onPress={handleScan}>
          <Ionicons name="scan-outline" size={20} color={theme.colors.text} style={styles.btnIcon} />
          <Text style={styles.primaryButtonText}>Считать OBD-данные</Text>
        </Pressable>
      )}

      {scanning && (
        <GradientCard style={styles.centeredCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scanningText}>Сканирование...</Text>
        </GradientCard>
      )}

      {error && (
        <GradientCard>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={handleScan}>
            <Text style={styles.primaryButtonText}>Повторить</Text>
          </Pressable>
        </GradientCard>
      )}

      {result && (
        <>
          <GradientCard style={styles.infoRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Протокол</Text>
              <Text style={styles.metaValue}>{result.protocol}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Напряжение</Text>
              <Text style={styles.metaValue}>{result.voltage}</Text>
            </View>
          </GradientCard>

          {result.codes.length === 0 ? (
            <GradientCard style={styles.centeredCard}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              <Text style={styles.okText}>Ошибок не обнаружено</Text>
              <Text style={styles.okDesc}>{result.description}</Text>
            </GradientCard>
          ) : (
            <GradientCard>
              <Text style={styles.sectionTitle}>Коды ошибок</Text>
              <View style={styles.badgeRow}>
                {result.codes.map((code) => (
                  <View
                    key={code}
                    style={[styles.badge, { backgroundColor: SEVERITY_COLOR[result.severity] ?? theme.colors.warning }]}
                  >
                    <Text style={styles.badgeText}>{code}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.description}>{result.description}</Text>
              {result.diagnosisBoost ? (
                <Text style={styles.boost}>{result.diagnosisBoost}</Text>
              ) : null}
              {result.confidenceBoost > 0 && (
                <Text style={styles.confidence}>
                  +{Math.round(result.confidenceBoost * 100)}% к уверенности AI
                </Text>
              )}
            </GradientCard>
          )}

          <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Готово</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  centeredCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: theme.spacing.xl,
  },
  scanningText: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  metaValue: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  okText: {
    color: theme.colors.success,
    fontSize: 20,
    fontWeight: '800',
  },
  okDesc: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  description: {
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  boost: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 6,
  },
  confidence: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  btnIcon: {
    marginRight: 4,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
});
