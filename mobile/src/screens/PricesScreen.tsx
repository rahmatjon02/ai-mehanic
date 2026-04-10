import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { PricesResponse, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Prices'>;

export function PricesScreen({ route }: Props) {
  const [data, setData] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const prices = await apiService.getPrices(route.params.diagnosisId);
        if (active) {
          setData(prices);
        }
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        Alert.alert('Ошибка загрузки цен', message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [route.params.diagnosisId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoaderDots label="Загружаем цены на детали..." />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Данные о ценах недоступны.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {data.parts.map((part) => {
        const cheapest = Math.min(...part.sources.map((source) => source.price));
        return (
          <GradientCard key={part.name}>
            <Text style={styles.partName}>{part.name}</Text>
            {part.sources.map((source) => (
              <View
                key={`${part.name}-${source.store}`}
                style={[
                  styles.sourceCard,
                  source.price === cheapest ? styles.cheapestCard : undefined,
                ]}
              >
                <View style={styles.sourceInfo}>
                  <Text style={styles.storeName}>{source.store}</Text>
                  <Text style={styles.availability}>{source.availability}</Text>
                  <Text style={styles.urlText}>{source.url}</Text>
                </View>
                <Text style={styles.priceText}>${source.price}</Text>
              </View>
            ))}
          </GradientCard>
        );
      })}
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
    padding: theme.spacing.lg,
  },
  partName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  sourceCard: {
    borderRadius: theme.radius,
    padding: 14,
    backgroundColor: '#151515',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#232323',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sourceInfo: {
    flex: 1,
  },
  cheapestCard: {
    borderColor: theme.colors.success,
  },
  storeName: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  availability: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  urlText: {
    color: theme.colors.warning,
    marginTop: 4,
  },
  priceText: {
    color: theme.colors.success,
    fontSize: 22,
    fontWeight: '800',
  },
  errorText: {
    color: theme.colors.danger,
  },
});
