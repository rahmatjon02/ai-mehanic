import { Ionicons } from '@expo/vector-icons';
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
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { ChatSession, MainTabParamList, RootStackParamList } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ChatHistory'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ChatHistoryScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiService.getChatSessions();
      setSessions(result);
    } catch (error) {
      Alert.alert('Ошибка загрузки чатов', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const startChat = () => {
    navigation.navigate('Chat', undefined);
  };

  const deleteChat = (session: ChatSession) => {
    Alert.alert('Удалить чат', `Удалить «${session.title}»?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteChatSession(session.id);
            await loadSessions();
          } catch (error) {
            Alert.alert('Ошибка', (error as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadSessions}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI чат</Text>
          <Text style={styles.subtitle}>История разговоров с механиком</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={startChat}>
          <Ionicons name="add" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <Pressable style={styles.primaryButton} onPress={startChat}>
        <Text style={styles.primaryButtonText}>Новый чат</Text>
      </Pressable>

      {loading ? <LoaderDots label="Загружаем чаты..." /> : null}

      {!loading && sessions.length === 0 ? (
        <GradientCard>
          <Text style={styles.emptyText}>
            Чатов пока нет. Напиши AI механику про симптомы, смету или
            странный звук.
          </Text>
        </GradientCard>
      ) : null}

      {sessions.map((session) => (
        <Pressable
          key={session.id}
          onPress={() => navigation.navigate('Chat', { sessionId: session.id })}
        >
          <GradientCard style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {session.title}
                </Text>
                {session.lastMessage ? (
                  <Text style={styles.lastMessage} numberOfLines={2}>
                    {session.lastMessage}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => deleteChat(session)} hitSlop={10}>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.colors.danger}
                />
              </Pressable>
            </View>
            <Text style={styles.meta}>
              {new Date(session.updatedAt).toLocaleString('ru-RU')}
            </Text>
          </GradientCard>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, marginTop: 4 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800' },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center' },
  sessionCard: { gap: 10 },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionText: { flex: 1 },
  sessionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  lastMessage: { color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 },
  meta: { color: theme.colors.warning, fontWeight: '700', fontSize: 12 },
});
