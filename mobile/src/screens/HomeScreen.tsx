import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { SeverityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/auth-context';
import { useObd } from '../context/obd-context';
import { apiService } from '../services/api';
import { theme } from '../theme';
import {
  Car,
  DiagnosisListItem,
  MainTabParamList,
  RootStackParamList,
  UploadAsset,
} from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { cars } = useAuth();
  const [recent, setRecent] = useState<DiagnosisListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingActive, setRecordingActive] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [carPickerOpen, setCarPickerOpen] = useState(false);
  const { useObdData, setUseObdData, latestReading } = useObd();

  const loadRecent = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const [health, history] = await Promise.allSettled([
        apiService.health(),
        apiService.getHistory(3),
      ]);
      setApiOnline(
        health.status === 'fulfilled' && health.value.status === 'ok',
      );
      if (history.status === 'fulfilled') {
        setRecent(history.value);
      }
    } catch {
      // Silent fail — user may not be logged in
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, [loadRecent]),
  );

  const navigateToDiagnosis = (upload: UploadAsset, inputType: 'image' | 'audio' | 'video') => {
    navigation.navigate('Diagnosis', {
      upload,
      inputType,
      obdReading: useObdData ? latestReading : null,
      carId: selectedCar?.id,
    });
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужно разрешение', 'Разреши доступ к фото, чтобы загрузить изображение.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    navigateToDiagnosis(
      { uri: asset.uri, name: asset.fileName ?? 'car-photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' },
      'image',
    );
  };

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    navigateToDiagnosis(
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'video/mp4' },
      'video',
    );
  };

  const toggleRecording = async () => {
    if (!recordingActive) {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Нужно разрешение', 'Разреши доступ к микрофону для записи аудио.');
        return;
      }

      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordingActive(true);
      return;
    }

    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    setRecordingActive(false);

    if (!uri) {
      Alert.alert('Ошибка записи', 'Аудиофайл не был создан.');
      return;
    }

    navigateToDiagnosis({ uri, name: 'voice-note.m4a', mimeType: 'audio/mp4' }, 'audio');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loadingRecent}
          onRefresh={loadRecent}
          tintColor={theme.colors.primary}
        />
      }
    >
      <GradientCard style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.title}>AI Mechanic</Text>
            <Text style={styles.subtitle}>Диагностика проблемы автомобиля за секунды</Text>
            {apiOnline !== null ? (
              <Text style={apiOnline ? styles.apiOnline : styles.apiOffline}>
                API {apiOnline ? 'online' : 'offline'}
              </Text>
            ) : null}
          </View>
          {/* OBD mock button — top right */}
          <Pressable style={styles.obdIconButton} onPress={() => navigation.navigate('OBDResult')}>
            <Text style={styles.obdIconText}>🔌</Text>
          </Pressable>
        </View>
      </GradientCard>

      {/* Car selector — only shown when user has saved cars */}
      {cars.length > 0 ? (
        <GradientCard>
          <Text style={styles.sectionTitle}>Выбрать машину</Text>
          <Pressable
            style={styles.carSelector}
            onPress={() => setCarPickerOpen((v) => !v)}
          >
            <Text style={styles.carSelectorText}>
              {selectedCar
                ? `${selectedCar.make} ${selectedCar.model} ${selectedCar.year}`
                : 'Без привязки к машине'}
            </Text>
            <Ionicons
              name={carPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>

          {carPickerOpen ? (
            <View style={styles.carList}>
              <Pressable
                style={[styles.carOption, !selectedCar && styles.carOptionActive]}
                onPress={() => { setSelectedCar(null); setCarPickerOpen(false); }}
              >
                <Text style={styles.carOptionText}>Без привязки к машине</Text>
              </Pressable>
              {cars.map((car) => (
                <Pressable
                  key={car.id}
                  style={[
                    styles.carOption,
                    selectedCar?.id === car.id && styles.carOptionActive,
                  ]}
                  onPress={() => { setSelectedCar(car); setCarPickerOpen(false); }}
                >
                  <Text style={styles.carOptionText}>
                    {car.make} {car.model} {car.year}
                  </Text>
                  {car.vin ? (
                    <Text style={styles.carOptionVin}>{car.vin}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </GradientCard>
      ) : null}

      {/* OBD card */}
      <GradientCard>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.sectionTitle}>Использовать OBD-данные</Text>
            <Text style={styles.mutedText}>
              Усиль диагностику данными OBD и кодами двигателя вроде P0300 и P0420.
            </Text>
          </View>
          <Switch
            value={useObdData}
            onValueChange={setUseObdData}
            trackColor={{ false: '#3A3A3A', true: theme.colors.accent }}
            thumbColor={useObdData ? theme.colors.primary : '#D1D5DB'}
          />
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('OBD')}>
          <Text style={styles.secondaryButtonText}>Считать OBD-данные</Text>
        </Pressable>
        {latestReading ? (
          <Text style={styles.obdHint}>Последние OBD-коды: {latestReading.codes.join(', ')}</Text>
        ) : null}
      </GradientCard>

      <Pressable style={styles.primaryButton} onPress={pickPhoto}>
        <Text style={styles.primaryButtonText}>Загрузить фото</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={toggleRecording}>
        <Text style={styles.primaryButtonText}>
          {recordingActive ? 'Остановить запись' : 'Записать аудио'}
        </Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={pickVideo}>
        <Text style={styles.primaryButtonText}>Загрузить видео</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Последние диагностики</Text>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.mutedText}>Диагностик ещё нет.</Text>
      ) : null}

      {recent.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => navigation.navigate('Diagnosis', { diagnosisId: item.id })}
        >
          <GradientCard style={styles.recentCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.problem}</Text>
              <SeverityBadge severity={item.severity} />
            </View>
            <Text style={styles.mutedText} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.priceText}>
              {item.totalMin} — {item.totalMax} сомон
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
  hero: { paddingVertical: 24 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  obdIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  obdIconText: { fontSize: 22 },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, marginTop: 6, fontSize: 15 },
  apiOnline: { color: theme.colors.success, marginTop: 8, fontWeight: '700' },
  apiOffline: { color: theme.colors.danger, marginTop: 8, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  sectionHeader: { marginTop: 8 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  mutedText: { color: theme.colors.textMuted, lineHeight: 20 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 18 },
  secondaryButton: {
    marginTop: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: '#191919',
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '700' },
  recentCard: { gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  priceText: { color: theme.colors.warning, fontSize: 16, fontWeight: '700' },
  obdHint: { color: theme.colors.success, marginTop: theme.spacing.sm },
  // Car selector
  carSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131313',
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 8,
  },
  carSelectorText: { color: theme.colors.text, fontSize: 15 },
  carList: { marginTop: 8, gap: 4 },
  carOption: {
    padding: 12,
    borderRadius: theme.radius,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  carOptionActive: { borderColor: theme.colors.primary },
  carOptionText: { color: theme.colors.text, fontWeight: '600' },
  carOptionVin: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
});
