import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { useAuth } from '../context/auth-context';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { MainTabParamList, RootStackParamList, VinDecodeResult } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'VINTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function VinScreen(_props: Props) {
  const { refreshCars } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<VinDecodeResult | null>(null);
  const scannedRef = useRef(false);

  const handleDecode = async (rawVin: string) => {
    const cleaned = rawVin.trim().toUpperCase();
    if (!cleaned) {
      Alert.alert('Ошибка', 'Введите VIN');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const data = await apiService.decodeVin(cleaned);
      setResult(data);
      setVin(cleaned);
    } catch (err) {
      Alert.alert('Ошибка VIN', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCar = async () => {
    if (!result) return;

    try {
      setSaving(true);
      await apiService.createCar({
        vin: vin || undefined,
        make: result.make,
        model: result.model,
        year: Number(result.year) || new Date().getFullYear(),
        bodyType: result.bodyType !== 'Неизвестно' ? result.bodyType : undefined,
        engineSize: result.engineSize !== 'Неизвестно' ? result.engineSize : undefined,
      });
      await refreshCars();
      Alert.alert('Готово', `${result.make} ${result.model} сохранён в профиль`);
      setResult(null);
      setVin('');
    } catch (err) {
      Alert.alert('Ошибка сохранения', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(false);
    setVin(data);
    handleDecode(data);
    setTimeout(() => { scannedRef.current = false; }, 2000);
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Нужно разрешение', 'Разреши доступ к камере для сканирования VIN');
        return;
      }
    }
    setScanning(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>VIN сканер</Text>
        <Text style={styles.subtitle}>
          Отсканируй VIN-код или введи его вручную для получения информации об автомобиле
        </Text>

        {/* Scanner */}
        {scanning ? (
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['code39', 'code128', 'datamatrix', 'qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <Pressable style={styles.cancelScan} onPress={() => setScanning(false)}>
              <Ionicons name="close-circle" size={36} color={theme.colors.text} />
            </Pressable>
            <View style={styles.scanOverlay}>
              <Text style={styles.scanHint}>Наведи на VIN-код</Text>
            </View>
          </View>
        ) : (
          <Pressable style={styles.scanButton} onPress={startScanning}>
            <Ionicons name="barcode-outline" size={28} color={theme.colors.text} />
            <Text style={styles.scanButtonText}>Сканировать VIN</Text>
          </Pressable>
        )}

        {/* Manual input */}
        <GradientCard>
          <Text style={styles.label}>VIN вручную</Text>
          <TextInput
            style={styles.input}
            value={vin}
            onChangeText={(t) => setVin(t.toUpperCase())}
            placeholder="1HGBH41JXMN109186"
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            maxLength={17}
          />
          <Text style={styles.vinLength}>{vin.length}/17</Text>

          <Pressable
            style={[styles.primaryButton, (loading || vin.length !== 17) && styles.disabled]}
            onPress={() => handleDecode(vin)}
            disabled={loading || vin.length !== 17}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>Декодировать VIN</Text>
            )}
          </Pressable>
        </GradientCard>

        {/* Result */}
        {result ? (
          <GradientCard style={styles.resultCard}>
            <Text style={styles.resultTitle}>Информация об автомобиле</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Марка</Text>
              <Text style={styles.resultValue}>{result.make}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Модель</Text>
              <Text style={styles.resultValue}>{result.model}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Год</Text>
              <Text style={styles.resultValue}>{result.year}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Кузов</Text>
              <Text style={styles.resultValue}>{result.bodyType}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Двигатель</Text>
              <Text style={styles.resultValue}>{result.engineSize} л</Text>
            </View>

            <Pressable
              style={[styles.saveButton, saving && styles.disabled]}
              onPress={handleSaveCar}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={theme.colors.text} />
                  <Text style={styles.saveButtonText}>Сохранить машину</Text>
                </>
              )}
            </Pressable>
          </GradientCard>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, lineHeight: 20 },
  scannerContainer: {
    height: 260,
    borderRadius: theme.radius,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: { flex: 1 },
  cancelScan: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  scanOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    alignItems: 'center',
  },
  scanHint: { color: '#fff', fontWeight: '700' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scanButtonText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  label: { color: theme.colors.textMuted, fontSize: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#131313',
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    color: theme.colors.text,
    fontSize: 16,
    letterSpacing: 2,
  },
  vinLength: {
    color: theme.colors.textMuted,
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  resultCard: { gap: 10 },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  resultKey: { color: theme.colors.textMuted, fontSize: 15 },
  resultValue: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
});
