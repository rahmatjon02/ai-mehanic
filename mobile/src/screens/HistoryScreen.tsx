import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { SeverityBadge } from '../components/StatusBadge';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { DiagnosisListItem, MainTabParamList, RootStackParamList } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<DiagnosisListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const result = await apiService.getHistory(20);
      setHistory(result);
    } catch (error) {
      Alert.alert('Ошибка загрузки истории', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [loadHistory]),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHistory} tintColor={theme.colors.primary} />}
    >
      <Text style={styles.title}>История диагностик</Text>
      {loading ? <LoaderDots label="Загружаем прошлые диагностики..." /> : null}

      {!loading && history.length === 0 ? (
        <GradientCard>
          <Text style={styles.emptyText}>Диагностик пока нет. Начни с вкладки «Главная».</Text>
        </GradientCard>
      ) : null}

      {history.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => navigation.navigate('Diagnosis', { diagnosisId: item.id })}
        >
          <GradientCard style={styles.historyCard}>
            <Text style={styles.problem}>{item.problem}</Text>
            <SeverityBadge severity={item.severity} />
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleString()} • ${item.totalMin} - ${item.totalMax}
            </Text>
          </GradientCard>
        </Pressable>
      ))}
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
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  historyCard: {
    gap: 10,
  },
  problem: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    color: theme.colors.textMuted,
  },
  meta: {
    color: theme.colors.warning,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
