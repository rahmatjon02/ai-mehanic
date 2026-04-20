import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { RootStackParamList, UploadAsset } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OBDResult'>;

type Phase = 'connecting' | 'scanning' | 'done';

const OBD_CODES = [
  { code: 'P0420', description: 'КПД катализатора ниже порога', severity: 'medium' as const },
  { code: 'P0171', description: 'Бедная смесь, банк 1', severity: 'high' as const },
  { code: 'P0300', description: 'Случайные пропуски зажигания', severity: 'high' as const },
  { code: 'P0401', description: 'Недостаточный поток EGR', severity: 'low' as const },
];

const ENGINE_DATA = [
  { label: 'Обороты', value: '780 RPM' },
  { label: 'Температура', value: '91°C' },
  { label: 'Топливо', value: '34%' },
  { label: 'Напряжение', value: '13.8V' },
  { label: 'Пробег', value: '187 450 км' },
];

const SEVERITY_COLORS: Record<string, string> = {
  high: theme.colors.danger,
  medium: theme.colors.warning,
  low: theme.colors.success,
};

const SEVERITY_LABELS: Record<string, string> = {
  high: '🔴 Высокий',
  medium: '🟡 Средний',
  low: '🟢 Низкий',
};

export function OBDResultScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [diagnosing, setDiagnosing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();

    const t1 = setTimeout(() => setPhase('scanning'), 2000);
    const t2 = setTimeout(() => {
      setPhase('done');
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fadeAnim, pulseAnim]);

  const diagnoseWithObd = async () => {
    setDiagnosing(true);
    try {
      const obdText = `OBD диагностика автомобиля. Коды ошибок: P0420 (КПД катализатора ниже порога), P0171 (бедная смесь банк 1), P0300 (случайные пропуски зажигания), P0401 (недостаточный поток EGR). Обороты двигателя 780 RPM, температура охлаждающей жидкости 91°C, уровень топлива 34%, напряжение бортовой сети 13.8V, пробег 187450 км.`;

      const blob = new Blob([obdText], { type: 'text/plain' });
      const uri = URL.createObjectURL(blob);
      const upload: UploadAsset = {
        uri,
        name: 'obd-data.txt',
        mimeType: 'text/plain',
      };

      const diagnosis = await apiService.analyzeProblem(upload, 'image');
      navigation.navigate('Diagnosis', {
        diagnosisId: diagnosis.diagnosisId,
        obdReading: {
          codes: OBD_CODES.map((c) => c.code),
          diagnosisBoost: 'Диагностика усилена данными OBD: P0420, P0171, P0300, P0401.',
          confidenceBoost: 0.12,
        },
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить OBD данные на диагностику');
    } finally {
      setDiagnosing(false);
    }
  };

  if (phase !== 'done') {
    return (
      <View style={styles.centered}>
        <GradientCard style={styles.loadingCard}>
          <Animated.Text style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}>
            🔌
          </Animated.Text>
          <Text style={styles.loadingTitle}>
            {phase === 'connecting'
              ? 'Подключение к бортовому компьютеру...'
              : 'Сканирование систем...'}
          </Text>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </GradientCard>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      contentContainerStyle={styles.content}
    >
      <GradientCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>OBD сканирование завершено</Text>
        <Text style={styles.heroSubtitle}>Найдено {OBD_CODES.length} кода ошибок</Text>
      </GradientCard>

      <GradientCard>
        <Text style={styles.sectionTitle}>Найденные коды ошибок</Text>
        {OBD_CODES.map((item) => (
          <View key={item.code} style={styles.codeRow}>
            <View style={styles.codeInfo}>
              <Text style={styles.codeText}>{item.code}</Text>
              <Text style={styles.codeDesc}>{item.description}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[item.severity] + '20', borderColor: SEVERITY_COLORS[item.severity] }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[item.severity] }]}>
                {SEVERITY_LABELS[item.severity]}
              </Text>
            </View>
          </View>
        ))}
      </GradientCard>

      <GradientCard>
        <Text style={styles.sectionTitle}>Данные двигателя</Text>
        {ENGINE_DATA.map((item) => (
          <View key={item.label} style={styles.dataRow}>
            <Text style={styles.dataLabel}>• {item.label}</Text>
            <Text style={styles.dataValue}>{item.value}</Text>
          </View>
        ))}
      </GradientCard>

      <Pressable
        style={[styles.primaryButton, diagnosing && styles.buttonDisabled]}
        onPress={diagnoseWithObd}
        disabled={diagnosing}
      >
        <Text style={styles.primaryButtonText}>
          {diagnosing ? 'Диагностируем...' : 'Диагностировать с OBD данными'}
        </Text>
      </Pressable>
    </Animated.ScrollView>
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
  loadingCard: { width: '100%', alignItems: 'center', gap: 20, paddingVertical: 40 },
  loadingIcon: { fontSize: 56 },
  loadingTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  heroCard: { gap: 8, paddingVertical: 24 },
  heroTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: theme.colors.success, fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  codeInfo: { flex: 1 },
  codeText: { color: theme.colors.primary, fontWeight: '800', fontSize: 15 },
  codeDesc: { color: theme.colors.textMuted, marginTop: 2 },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dataLabel: { color: theme.colors.textMuted },
  dataValue: { color: theme.colors.text, fontWeight: '700' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
});
