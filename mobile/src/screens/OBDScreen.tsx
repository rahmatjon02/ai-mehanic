import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { useObd } from '../context/obd-context';
import { theme } from '../theme';
import { ObdReading, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'OBD'>;

const mockReading: ObdReading = {
  codes: ['P0300', 'P0420'],
  diagnosisBoost:
    'Данные OBD указывают на случайные пропуски зажигания и низкую эффективность катализатора, что повышает уверенность в неисправности системы зажигания или выхлопа.',
  confidenceBoost: 0.08,
};

export function OBDScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const { saveReading, setUseObdData } = useObd();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 2600);

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoaderDots label="Считываем данные OBD..." />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientCard style={styles.heroCard}>
        <Text style={styles.title}>Чтение OBD завершено</Text>
        <Text style={styles.subtitle}>Найдены коды: {mockReading.codes.join(', ')}</Text>
        <Text style={styles.description}>{mockReading.diagnosisBoost}</Text>
      </GradientCard>

      <GradientCard>
        <Text style={styles.sectionTitle}>Усиленная сводка диагностики</Text>
        <Text style={styles.item}>P0300 указывает на случайные пропуски зажигания и неровную работу двигателя.</Text>
        <Text style={styles.item}>P0420 намекает на проблемы с катализатором или датчиками выхлопа.</Text>
        <Text style={styles.item}>Прирост уверенности: +{Math.round(mockReading.confidenceBoost * 100)}%</Text>
      </GradientCard>

      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          saveReading(mockReading);
          setUseObdData(true);
          navigation.goBack();
        }}
      >
        <Text style={styles.primaryButtonText}>Использовать эти OBD-данные</Text>
      </Pressable>
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
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    gap: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  description: {
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  item: {
    color: theme.colors.text,
    marginTop: 8,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
});
