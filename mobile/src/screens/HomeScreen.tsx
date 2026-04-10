import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
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
import { useObd } from '../context/obd-context';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { DiagnosisListItem, MainTabParamList, RootStackParamList, UploadAsset } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const [recent, setRecent] = useState<DiagnosisListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const { useObdData, setUseObdData, latestReading } = useObd();

  const loadRecent = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const history = await apiService.getHistory(3);
      setRecent(history);
    } catch (error) {
      Alert.alert('Ошибка API', (error as Error).message);
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

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    navigateToDiagnosis(
      {
        uri: asset.uri,
        name: asset.fileName ?? 'car-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      },
      'image',
    );
  };

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    navigateToDiagnosis(
      {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'video/mp4',
      },
      'video',
    );
  };

  const toggleRecording = async () => {
    if (!recording) {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Нужно разрешение', 'Разреши доступ к микрофону для записи аудио.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(nextRecording);
      setRecordingActive(true);
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingActive(false);

    if (!uri) {
      Alert.alert('Ошибка записи', 'Аудиофайл не был создан.');
      return;
    }

    navigateToDiagnosis(
      {
        uri,
        name: 'voice-note.m4a',
        mimeType: 'audio/mp4',
      },
      'audio',
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingRecent} onRefresh={loadRecent} tintColor={theme.colors.primary} />}
    >
      <GradientCard style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.title}>AI Mechanic</Text>
            <Text style={styles.subtitle}>Диагностика проблемы автомобиля за секунды</Text>
          </View>
          <Ionicons name="car-sport" size={36} color={theme.colors.primary} />
        </View>
      </GradientCard>

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
            trackColor={{ false: '#3A3A3A', true: '#7F1D1D' }}
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
              ${item.totalMin} - ${item.totalMax}
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
  hero: {
    paddingVertical: 24,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textMuted,
    marginTop: 6,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  mutedText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: '#191919',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  recentCard: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  priceText: {
    color: theme.colors.warning,
    fontSize: 16,
    fontWeight: '700',
  },
  obdHint: {
    color: theme.colors.success,
    marginTop: theme.spacing.sm,
  },
});
