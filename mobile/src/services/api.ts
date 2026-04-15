import axios from 'axios';
import { Platform } from 'react-native';
import {
  DiagnosisDetail,
  DiagnosisListItem,
  DiagnosisResult,
  PricesResponse,
  QuoteResult,
  UploadAsset,
  UploadType,
} from '../types';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 60000,
});

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
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
      throw new Error(response.data.error ?? 'API request failed');
    }

    return response.data.data;
  } catch (error: any) {
    const apiMessage =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      'API request failed';
    throw new Error(apiMessage);
  }
}

export const apiService = {
  async analyzeProblem(file: UploadAsset, type: UploadType) {
    const formData = new FormData();
    await appendUploadAsset(formData, 'file', file);

    return unwrap<DiagnosisResult & { diagnosisId: string }>(
      api.post(`/diagnosis/analyze?type=${type}`, formData),
    );
  },

  async checkQuote(diagnosisId: string, options: { file?: UploadAsset; quoteText?: string }) {
    const formData = new FormData();

    if (options.file) {
      await appendUploadAsset(formData, 'file', options.file);
    }

    if (options.quoteText) {
      formData.append('quoteText', options.quoteText);
    }

    return unwrap<QuoteResult>(
      api.post(`/quote/check/${diagnosisId}`, formData),
    );
  },

  getPrices(diagnosisId: string) {
    return unwrap<PricesResponse>(api.get(`/prices/${diagnosisId}`));
  },

  getHistory(limit = 20) {
    return unwrap<DiagnosisListItem[]>(api.get(`/diagnosis?limit=${limit}`));
  },

  getDiagnosis(diagnosisId: string) {
    return unwrap<DiagnosisDetail>(api.get(`/diagnosis/${diagnosisId}`));
  },
};
