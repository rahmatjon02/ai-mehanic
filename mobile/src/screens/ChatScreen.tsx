import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
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
import { LoaderDots } from '../components/LoaderDots';
import { apiService } from '../services/api';
import { theme } from '../theme';
import {
  ChatMessage,
  ChatSessionDetail,
  RootStackParamList,
  UploadAsset,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const loaded = route.params?.sessionId
          ? await apiService.getChatSession(route.params.sessionId)
          : await apiService.createChatSession();
        setSession(loaded);
        setMessages(loaded.messages);
        navigation.setOptions({ title: loaded.title || 'AI чат' });
      } catch (error) {
        Alert.alert('Ошибка чата', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigation, route.params?.sessionId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, sending]);

  const send = async (asset?: UploadAsset, fallbackText = '') => {
    const content = input.trim() || fallbackText;
    if ((!content && !asset) || !session || sending) return;

    setInput('');
    setSending(true);
    try {
      const result = await apiService.sendChatMessage(
        session.id,
        content,
        asset,
      );
      setMessages((current) => [
        ...current,
        result.userMessage,
        result.assistantMessage,
      ]);
      const updated = await apiService.getChatSession(session.id);
      setSession(updated);
      navigation.setOptions({ title: updated.title || 'AI чат' });
    } catch (error) {
      Alert.alert('Ошибка отправки', (error as Error).message);
      if (!asset) setInput(content);
    } finally {
      setSending(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужно разрешение', 'Разреши доступ к фото.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    await send(
      {
        uri: asset.uri,
        name: asset.fileName ?? 'chat-photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      },
      'Посмотри фото и подскажи, что может быть с автомобилем.',
    );
  };

  const pickMediaFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'application/octet-stream';
    const label = mimeType.startsWith('video/')
      ? 'Посмотри видео и подскажи, что может быть с автомобилем.'
      : 'Прослушай аудио и подскажи, что может быть с автомобилем.';

    await send(
      {
        uri: asset.uri,
        name: asset.name,
        mimeType,
      },
      label,
    );
  };

  const toggleRecording = async () => {
    if (!recording) {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Нужно разрешение', 'Разреши доступ к микрофону.');
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
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) {
      Alert.alert('Ошибка записи', 'Аудиофайл не был создан.');
      return;
    }

    await send(
      { uri, name: 'chat-voice.m4a', mimeType: 'audio/mp4' },
      'Прослушай запись и подскажи, что может быть с автомобилем.',
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoaderDots label="Открываем чат..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={36}
              color={theme.colors.primary}
            />
            <Text style={styles.emptyTitle}>Спроси AI механика</Text>
            <Text style={styles.emptyText}>
              Напиши сообщение или прикрепи фото, видео, аудио. Можно записать
              звук прямо здесь.
            </Text>
          </View>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.messageAuthor}>
                {isUser ? 'Вы' : 'AI механик'}
              </Text>
              <Text style={styles.messageText}>{message.content}</Text>
              {message.fileName ? (
                <View style={styles.attachmentBadge}>
                  <Ionicons
                    name={
                      message.fileType === 'image'
                        ? 'image'
                        : message.fileType === 'video'
                          ? 'videocam'
                          : message.fileType === 'audio'
                            ? 'mic'
                            : 'attach'
                    }
                    size={14}
                    color={theme.colors.text}
                  />
                  <Text style={styles.attachmentText} numberOfLines={1}>
                    {message.fileName}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {sending ? (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <LoaderDots label="AI думает..." />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <Pressable
          style={styles.toolButton}
          onPress={pickPhoto}
          disabled={sending || Boolean(recording)}
        >
          <Ionicons name="image-outline" size={20} color={theme.colors.text} />
        </Pressable>
        <Pressable
          style={styles.toolButton}
          onPress={pickMediaFile}
          disabled={sending || Boolean(recording)}
        >
          <Ionicons name="attach" size={20} color={theme.colors.text} />
        </Pressable>
        <Pressable
          style={[styles.toolButton, recording && styles.recordingButton]}
          onPress={toggleRecording}
          disabled={sending}
        >
          <Ionicons
            name={recording ? 'stop' : 'mic-outline'}
            size={20}
            color={theme.colors.text}
          />
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            recording ? 'Идёт запись...' : 'Напиши про проблему автомобиля...'
          }
          placeholderTextColor={theme.colors.textMuted}
          multiline
          editable={!recording}
        />
        <Pressable
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || sending || Boolean(recording)}
        >
          <Ionicons name="send" size={20} color={theme.colors.text} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messages: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 132,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 48,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 8,
    padding: theme.spacing.md,
    gap: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageAuthor: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  messageText: { color: theme.colors.text, lineHeight: 21 },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  attachmentText: { color: theme.colors.text, flexShrink: 1, fontSize: 12 },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toolButton: {
    width: 40,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recordingButton: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
