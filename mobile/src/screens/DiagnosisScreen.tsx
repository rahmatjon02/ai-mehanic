import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { SeverityBadge } from '../components/StatusBadge';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { DiagnosisResult, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Diagnosis'>;

export function DiagnosisScreen({ navigation, route }: Props) {
  const [progress, setProgress] = useState(8);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(route.params?.diagnosisId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    let active = true;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSlowWarning(false);

        slowTimer.current = setTimeout(() => {
          if (active) setSlowWarning(true);
        }, 15000);

        progressInterval = setInterval(() => {
          setProgress((current) => (current >= 92 ? current : current + 8));
        }, 400);

        if (route.params?.diagnosisId) {
          const detail = await apiService.getDiagnosis(route.params.diagnosisId);
          if (!active) return;
          setDiagnosisId(detail.id);
          setResult(detail.result);
          setProgress(100);
          return;
        }

        if (!route.params?.upload || !route.params?.inputType) {
          throw new Error('Не переданы данные для загрузки.');
        }

        const diagnosis = await apiService.analyzeProblem(
          route.params.upload,
          route.params.inputType,
          route.params.carId,
        );
        if (!active) return;
        setDiagnosisId(diagnosis.diagnosisId);
        setResult(diagnosis);
        setProgress(100);
      } catch (err) {
        const message = (err as Error).message || 'Не удалось загрузить данные для диагностики';
        setError(message);
        Alert.alert('Ошибка диагностики', message);
      } finally {
        if (progressInterval) clearInterval(progressInterval);
        if (slowTimer.current) clearTimeout(slowTimer.current);
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (progressInterval) clearInterval(progressInterval);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, [route.params]);

  const boostedResult = useMemo(() => {
    if (!result) return null;
    if (!route.params?.obdReading) return result;
    return {
      ...result,
      description: `${result.description} Усиление OBD: ${route.params.obdReading.diagnosisBoost}`,
      confidence: Math.min(0.99, result.confidence + route.params.obdReading.confidenceBoost),
    };
  }, [result, route.params?.obdReading]);

  const severityColor = (severity?: string) => {
    if (severity === 'high') return theme.colors.danger;
    if (severity === 'medium') return theme.colors.warning;
    return theme.colors.success;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <GradientCard style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Animated.Text style={[styles.progressLabel, { transform: [{ scale: pulseAnim }] }]}>
            {progress}%
          </Animated.Text>
          <LoaderDots label="Анализируем проблему автомобиля..." />
          {slowWarning ? (
            <Text style={styles.slowWarning}>
              Анализ занимает больше времени чем обычно...
            </Text>
          ) : null}
        </GradientCard>
      </View>
    );
  }

  if (error || !boostedResult || !diagnosisId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Результат диагностики недоступен.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientCard style={[styles.resultCard, { borderColor: severityColor(boostedResult.severity) }]}>
        <View style={styles.headerRow}>
          <Text style={styles.problemTitle}>{boostedResult.problem}</Text>
          <SeverityBadge severity={boostedResult.severity} />
        </View>
        <Text style={styles.description}>{boostedResult.description}</Text>
        <Text style={styles.costRange}>
          {boostedResult.total_cost_min} — {boostedResult.total_cost_max} сомон
        </Text>
        <Text style={styles.confidence}>Уверенность: {(boostedResult.confidence * 100).toFixed(0)}%</Text>

        {route.params?.obdReading ? (
          <Text style={styles.obdText}>OBD-коды: {route.params.obdReading.codes.join(', ')}</Text>
        ) : null}
      </GradientCard>

      <GradientCard>
        <Text style={styles.sectionTitle}>Нужные детали</Text>
        {boostedResult.parts_needed.map((part) => (
          <View key={part.name} style={styles.partRow}>
            <Text style={styles.partName}>{part.name}</Text>
            <Text style={styles.partPrice}>
              {part.price_min} — {part.price_max} сомон
            </Text>
          </View>
        ))}
      </GradientCard>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Quote', { diagnosisId })}>
        <Text style={styles.primaryButtonText}>Проверить смету механика</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Prices', { diagnosisId })}>
        <Text style={styles.secondaryButtonText}>Посмотреть цены на детали</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingCard: { width: '100%', alignItems: 'center', gap: 16 },
  progressLabel: { color: theme.colors.warning, fontWeight: '800', fontSize: 32 },
  slowWarning: { color: theme.colors.warning, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  resultCard: { gap: 14, borderWidth: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  problemTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '800', flex: 1 },
  description: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22 },
  costRange: { color: theme.colors.warning, fontSize: 26, fontWeight: '800' },
  confidence: { color: theme.colors.success, fontWeight: '600' },
  obdText: { color: theme.colors.primary, fontWeight: '700' },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  partName: { color: theme.colors.text, fontSize: 15, flex: 1 },
  partPrice: { color: theme.colors.textMuted, fontWeight: '700' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: theme.radius,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  errorText: { color: theme.colors.danger, textAlign: 'center', fontSize: 16 },
});
