import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GradientCard } from '../components/GradientCard';
import { LoaderDots } from '../components/LoaderDots';
import { VerdictBadge } from '../components/StatusBadge';
import { apiService } from '../services/api';
import { theme } from '../theme';
import { QuoteResult, RootStackParamList, UploadAsset } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Quote'>;

export function QuoteScreen({ route }: Props) {
  const [quoteText, setQuoteText] = useState('');
  const [quoteFile, setQuoteFile] = useState<UploadAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const pickQuoteImage = async () => {
    const response = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (response.canceled) return;

    const asset = response.assets[0];
    setQuoteFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const submitQuote = async () => {
    if (!quoteFile && !quoteText.trim()) {
      const message = 'Сначала добавь текст сметы или загрузи изображение.';
      setError(message);
      Alert.alert('Не хватает данных', message);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const comparison = await apiService.checkQuote(route.params.diagnosisId, {
        file: quoteFile ?? undefined,
        quoteText: quoteText.trim() || undefined,
      });
      setResult(comparison);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      Alert.alert('Ошибка проверки сметы', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GradientCard>
        <Text style={styles.sectionTitle}>Загрузи смету механика</Text>
        <Pressable style={styles.secondaryButton} onPress={pickQuoteImage}>
          <Text style={styles.secondaryButtonText}>
            {quoteFile ? `Выбрано: ${quoteFile.name}` : 'Загрузить фото сметы'}
          </Text>
        </Pressable>

        <Text style={styles.orText}>или введи текст вручную</Text>
        <TextInput
          value={quoteText}
          onChangeText={setQuoteText}
          style={styles.textInput}
          placeholder="Замена тормозных колодок, итого 420"
          placeholderTextColor="#6B7280"
          multiline
        />
      </GradientCard>

      <Pressable style={styles.primaryButton} onPress={submitQuote}>
        <Text style={styles.primaryButtonText}>Сравнить смету</Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <GradientCard>
          <LoaderDots label="Сравниваем смету механика..." />
        </GradientCard>
      ) : null}

      {result ? (
        <GradientCard style={styles.resultCard}>
          <VerdictBadge verdict={result.verdict} />
          <Text style={styles.amountText}>Механик запросил: {result.mechanic_total} сомон</Text>
          <Text style={styles.fairText}>
            Справедливая цена: {result.fair_estimate_min} — {result.fair_estimate_max} сомон
          </Text>
          {result.verdict === 'overpriced' ? (
            <Text style={styles.overchargeText}>
              Переплата: {result.overcharge_amount} сомон ({result.overcharge_percent}%)
            </Text>
          ) : null}
          <Text style={styles.explanation}>{result.explanation}</Text>
          {result.suspicious_items.length ? (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>Подозрительные пункты</Text>
              {result.suspicious_items.map((item) => (
                <Text key={item} style={styles.listItem}>
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}
        </GradientCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '700' },
  orText: { color: theme.colors.textMuted, textAlign: 'center', marginVertical: 12 },
  textInput: {
    minHeight: 120,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  resultCard: { gap: 12 },
  amountText: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  fairText: { color: theme.colors.warning, fontSize: 18, fontWeight: '700' },
  overchargeText: { color: theme.colors.danger, fontWeight: '800' },
  explanation: { color: theme.colors.textMuted, lineHeight: 22 },
  listBlock: { marginTop: 4 },
  listItem: { color: theme.colors.text, marginTop: 8 },
  errorText: { color: theme.colors.danger },
});
