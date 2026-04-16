import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
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
import { useAuth } from '../context/auth-context';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { MainTabParamList, RootStackParamList, User } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const { user, cars, logout, refreshCars } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await apiService.getProfile();
      setProfile(p);
    } catch {
      // Use local user data as fallback
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      refreshCars();
    }, [loadProfile, refreshCars]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), refreshCars()]);
    setRefreshing(false);
  };

  const handleDeleteCar = (carId: string, carName: string) => {
    Alert.alert(
      'Удалить машину',
      `Удалить ${carName}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteCar(carId);
              await refreshCars();
            } catch (err) {
              Alert.alert('Ошибка', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Выйти', 'Выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const displayUser = profile ?? user;
  const initials = displayUser?.name
    ? displayUser.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const diagnosisCount = profile?._count?.diagnoses ?? 0;

  if (loadingProfile && !user) {
    return (
      <View style={styles.centered}>
        <LoaderDots label="Загружаем профиль..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Avatar + Info */}
      <GradientCard style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{displayUser?.name ?? '—'}</Text>
        <Text style={styles.userEmail}>{displayUser?.email ?? '—'}</Text>
        {displayUser?.createdAt ? (
          <Text style={styles.joined}>
            В сервисе с {new Date(displayUser.createdAt).toLocaleDateString('ru-RU')}
          </Text>
        ) : null}
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{diagnosisCount}</Text>
            <Text style={styles.statLabel}>диагностик</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{cars.length}</Text>
            <Text style={styles.statLabel}>машин</Text>
          </View>
        </View>
      </GradientCard>

      {/* Saved cars */}
      <Text style={styles.sectionTitle}>Мои машины</Text>

      {cars.length === 0 ? (
        <GradientCard>
          <Text style={styles.emptyText}>
            Нет сохранённых машин. Добавь машину через вкладку VIN.
          </Text>
        </GradientCard>
      ) : (
        cars.map((car) => (
          <GradientCard key={car.id} style={styles.carCard}>
            <View style={styles.carRow}>
              <View style={styles.carInfo}>
                <Text style={styles.carName}>
                  {car.make} {car.model} {car.year}
                </Text>
                {car.vin ? (
                  <Text style={styles.carVin}>VIN: {car.vin}</Text>
                ) : null}
                {car.engineSize ? (
                  <Text style={styles.carMeta}>Двигатель: {car.engineSize} л</Text>
                ) : null}
                {car.bodyType ? (
                  <Text style={styles.carMeta}>{car.bodyType}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleDeleteCar(car.id, `${car.make} ${car.model}`)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
              </Pressable>
            </View>
          </GradientCard>
        ))
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
        <Text style={styles.logoutText}>Выйти</Text>
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
  },
  avatarCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  userName: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  userEmail: { color: theme.colors.textMuted, fontSize: 15 },
  joined: { color: theme.colors.textMuted, fontSize: 13 },
  statRow: { flexDirection: 'row', gap: 40, marginTop: 12 },
  stat: { alignItems: 'center' },
  statValue: { color: theme.colors.warning, fontSize: 24, fontWeight: '800' },
  statLabel: { color: theme.colors.textMuted, fontSize: 13 },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center' },
  carCard: {},
  carRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  carInfo: { flex: 1, gap: 4 },
  carName: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  carVin: { color: theme.colors.textMuted, fontSize: 13 },
  carMeta: { color: theme.colors.textMuted, fontSize: 13 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    marginTop: 8,
  },
  logoutText: { color: theme.colors.danger, fontWeight: '700', fontSize: 16 },
});
