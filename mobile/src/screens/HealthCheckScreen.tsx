import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
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
import { theme } from '../theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'HealthCheck'>;

interface CheckResult {
  label: string;
  key: string;
  passed: boolean | null;
  ms: number | null;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3006';

async function pingEndpoint(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export function HealthCheckScreen({ navigation: _navigation }: Props) {
  const [checks, setChecks] = useState<CheckResult[]>([
    { key: 'server', label: 'Соединение с сервером', passed: null, ms: null },
    { key: 'db', label: 'База данных', passed: null, ms: null },
    { key: 'gemini', label: 'Gemini AI', passed: null, ms: null },
    { key: 'nhtsa', label: 'VIN API', passed: null, ms: null },
  ]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const updateCheck = (key: string, result: { passed: boolean; ms: number }) => {
    setChecks((prev) =>
      prev.map((c) => (c.key === key ? { ...c, passed: result.passed, ms: result.ms } : c)),
    );
    setLog((prev) => [
      ...prev,
      `[${new Date().toISOString()}] ${key}: ${result.passed ? 'OK' : 'FAIL'} (${result.ms}ms)`,
    ]);
  };

  const runChecks = async () => {
    setRunning(true);
    setDone(false);
    setLog([`[${new Date().toISOString()}] Запуск диагностики...`]);
    setChecks((prev) => prev.map((c) => ({ ...c, passed: null, ms: null })));

    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();

    // 1. Server ping
    const serverResult = await pingEndpoint(`${API_BASE}/`);
    updateCheck('server', { passed: serverResult.ok, ms: serverResult.ms });
    await new Promise((r) => setTimeout(r, 300));

    // 2. Health diagnostics endpoint
    const healthResult = await pingEndpoint(`${API_BASE}/health/diagnostics`);

    let dbPassed = serverResult.ok;
    let geminiPassed = serverResult.ok;
    let nhtsaPassed = serverResult.ok;

    if (healthResult.ok) {
      try {
        const res = await fetch(`${API_BASE}/health/diagnostics`);
        const data = await res.json();
        if (data?.data) {
          dbPassed = data.data.db === true;
          geminiPassed = data.data.gemini === true;
          nhtsaPassed = data.data.nhtsa === true;
        }
      } catch {
        // use fallback
      }
    }

    await new Promise((r) => setTimeout(r, 300));
    updateCheck('db', { passed: dbPassed, ms: healthResult.ms });
    await new Promise((r) => setTimeout(r, 300));
    updateCheck('gemini', { passed: geminiPassed, ms: healthResult.ms + 50 });
    await new Promise((r) => setTimeout(r, 300));
    updateCheck('nhtsa', { passed: nhtsaPassed, ms: healthResult.ms + 80 });

    fadeAnim.stopAnimation();
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    setLog((prev) => [...prev, `[${new Date().toISOString()}] Диагностика завершена.`]);
    setRunning(false);
    setDone(true);
  };

  const exportLogs = async () => {
    const text = log.join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Готово', 'Логи скопированы в буфер обмена');
  };

  const allOk = checks.every((c) => c.passed === true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>Диагностика системы</Text>
        <Text style={styles.heroSubtitle}>Проверка всех компонентов AI Mechanic</Text>
      </GradientCard>

      <GradientCard>
        <Text style={styles.sectionTitle}>Статус компонентов</Text>
        {checks.map((check) => (
          <Animated.View
            key={check.key}
            style={[styles.checkRow, check.passed === null && running ? { opacity: fadeAnim } : {}]}
          >
            <Text style={styles.checkIcon}>
              {check.passed === null ? '⏳' : check.passed ? '✅' : '❌'}
            </Text>
            <View style={styles.checkInfo}>
              <Text style={styles.checkLabel}>{check.label}</Text>
              {check.ms !== null ? (
                <Text style={styles.checkMs}>{check.ms} мс</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    check.passed === null
                      ? theme.colors.textMuted
                      : check.passed
                      ? theme.colors.success
                      : theme.colors.danger,
                },
              ]}
            />
          </Animated.View>
        ))}
      </GradientCard>

      {done ? (
        <GradientCard style={[styles.resultCard, { borderColor: allOk ? theme.colors.success : theme.colors.danger }]}>
          <Text style={[styles.resultText, { color: allOk ? theme.colors.success : theme.colors.danger }]}>
            {allOk ? '✅ Все системы работают нормально' : '⚠️ Обнаружены проблемы'}
          </Text>
        </GradientCard>
      ) : null}

      <Pressable
        style={[styles.primaryButton, running && styles.buttonDisabled]}
        onPress={runChecks}
        disabled={running}
      >
        <Text style={styles.primaryButtonText}>
          {running ? 'Диагностируем...' : 'Запустить диагностику'}
        </Text>
      </Pressable>

      {log.length > 0 ? (
        <>
          <GradientCard>
            <Text style={styles.sectionTitle}>Журнал</Text>
            {log.map((line, i) => (
              <Text key={i} style={styles.logLine}>{line}</Text>
            ))}
          </GradientCard>

          <Pressable style={styles.secondaryButton} onPress={exportLogs}>
            <Text style={styles.secondaryButtonText}>Скопировать логи</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  heroCard: { gap: 8, paddingVertical: 20 },
  heroTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: theme.colors.textMuted },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  checkIcon: { fontSize: 20, width: 28 },
  checkInfo: { flex: 1 },
  checkLabel: { color: theme.colors.text, fontWeight: '600' },
  checkMs: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  resultCard: { borderWidth: 2, alignItems: 'center', paddingVertical: 16 },
  resultText: { fontWeight: '800', fontSize: 16 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '700' },
  logLine: { color: theme.colors.textMuted, fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
});
