import axios from 'axios';
import { Platform } from 'react-native';
import {
  AuthResult,
  Car,
  ChatSession,
  ChatSessionDetail,
  DiagnosisDetail,
  DiagnosisListItem,
  DiagnosisResult,
  HealthResult,
  ObdScanResult,
  PricesResponse,
  QuoteResult,
  SendChatMessageResult,
  UploadAsset,
  UploadType,
  User,
  VinDecodeResult,
} from '../types';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3006',
  timeout: 60000,
});

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/** Injected by AuthContext after login so every request carries the token. */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

async function appendUploadAsset(formData: FormData, fieldName: string, file: UploadAsset) {
  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, file.name);
    return;
  }

  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as any);
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  try {
    const response = await promise;
    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Ошибка API запроса');
    }
    return response.data.data;
  } catch (error: any) {
    const apiMessage =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      'Ошибка API запроса';
    throw new Error(apiMessage);
  }
}

export const apiService = {
  health() {
    return unwrap<HealthResult>(api.get(''));
  },

  // ─── Auth ───────────────────────────────────────────────────────────────────

  register(email: string, password: string, name: string) {
    return unwrap<AuthResult>(
      api.post('auth/register', { email, password, name }),
    );
  },

  login(email: string, password: string) {
    return unwrap<AuthResult>(
      api.post('auth/login', { email, password }),
    );
  },

  googleAuth(accessToken: string) {
    return unwrap<AuthResult>(
      api.post('auth/google', { accessToken }),
    );
  },

  getProfile() {
    return unwrap<User>(api.get('auth/profile'));
  },

  updateProfile(data: { name?: string; avatar?: string }) {
    return unwrap<User>(api.patch('auth/profile', data));
  },

  getChatSessions(limit = 30) {
    return unwrap<ChatSession[]>(api.get(`chat/sessions?limit=${limit}`));
  },

  createChatSession(title?: string) {
    return unwrap<ChatSessionDetail>(api.post('chat/sessions', { title }));
  },

  getChatSession(sessionId: string) {
    return unwrap<ChatSessionDetail>(api.get(`chat/sessions/${sessionId}`));
  },

  async sendChatMessage(
    sessionId: string,
    content: string,
    file?: UploadAsset,
  ) {
    const formData = new FormData();
    if (content.trim()) formData.append('content', content);
    if (file) await appendUploadAsset(formData, 'file', file);

    return unwrap<SendChatMessageResult>(
      api.post(`chat/sessions/${sessionId}/messages`, formData),
    );
  },

  deleteChatSession(sessionId: string) {
    return unwrap<ChatSessionDetail>(api.delete(`chat/sessions/${sessionId}`));
  },

  // ─── Diagnosis ──────────────────────────────────────────────────────────────

  async analyzeProblem(file: UploadAsset, type: UploadType, carId?: string) {
    const formData = new FormData();
    await appendUploadAsset(formData, 'file', file);
    if (carId) formData.append('carId', carId);

    return unwrap<DiagnosisResult & { diagnosisId: string }>(
      api.post(`diagnosis/analyze?type=${type}`, formData),
    );
  },

  async checkQuote(diagnosisId: string, options: { file?: UploadAsset; quoteText?: string }) {
    const formData = new FormData();
    if (options.file) await appendUploadAsset(formData, 'file', options.file);
    if (options.quoteText) formData.append('quoteText', options.quoteText);

    return unwrap<QuoteResult>(
      api.post(`quote/check/${diagnosisId}`, formData),
    );
  },

  getPrices(diagnosisId: string) {
    return unwrap<PricesResponse>(api.get(`prices/${diagnosisId}`));
  },

  getHistory(limit = 20) {
    return unwrap<DiagnosisListItem[]>(api.get(`diagnosis?limit=${limit}`));
  },

  getDiagnosis(diagnosisId: string) {
    return unwrap<DiagnosisDetail>(api.get(`diagnosis/${diagnosisId}`));
  },

  // ─── Cars ───────────────────────────────────────────────────────────────────

  getCars() {
    return unwrap<Car[]>(api.get('cars'));
  },

  createCar(data: {
    vin?: string;
    make: string;
    model: string;
    year: number;
    bodyType?: string;
    engineSize?: string;
  }) {
    return unwrap<Car>(api.post('cars', data));
  },

  deleteCar(carId: string) {
    return unwrap<{ id: string }>(api.delete(`cars/${carId}`));
  },

  // ─── VIN ────────────────────────────────────────────────────────────────────

  decodeVin(vin: string) {
    return unwrap<VinDecodeResult>(api.post('vin/decode', { vin }));
  },

  // ─── OBD ────────────────────────────────────────────────────────────────────

  scanObd() {
    return unwrap<ObdScanResult>(api.get('obd/scan'));
  },
};
