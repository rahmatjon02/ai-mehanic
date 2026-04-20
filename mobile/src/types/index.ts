export type Severity = 'low' | 'medium' | 'high';
export type Verdict = 'fair' | 'overpriced' | 'underpriced';
export type UploadType = 'image' | 'audio' | 'video';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt?: string;
  _count?: { diagnoses: number };
}

export interface AuthResult {
  access_token: string;
  user: User;
}

export interface HealthResult {
  name: string;
  status: 'ok';
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: 'image' | 'audio' | 'video' | 'file' | null;
  mimeType?: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
}

export interface ChatSessionDetail {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SendChatMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface VinDecodeResult {
  make: string;
  model: string;
  year: string;
  bodyType: string;
  engineSize: string;
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

export interface Car {
  id: string;
  userId: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  engineSize?: string;
  createdAt: string;
}

// ─── Diagnosis ────────────────────────────────────────────────────────────────

export interface PartEstimate {
  name: string;
  price_min: number;
  price_max: number;
  currency: string;
}

export interface DiagnosisResult {
  diagnosisId?: string;
  problem: string;
  description: string;
  severity: Severity;
  parts_needed: PartEstimate[];
  labor_cost_min: number;
  labor_cost_max: number;
  total_cost_min: number;
  total_cost_max: number;
  confidence: number;
}

export interface DiagnosisListItem {
  id: string;
  fileType: UploadType;
  problem: string;
  description: string;
  severity: Severity;
  totalMin: number;
  totalMax: number;
  createdAt: string;
  userId?: string;
  carId?: string;
}

export interface DiagnosisDetail {
  id: string;
  fileType: UploadType;
  filePath: string;
  createdAt: string;
  userId?: string;
  carId?: string;
  result: DiagnosisResult;
  quotes: QuoteResult[];
}

export interface QuoteResult {
  mechanic_total: number;
  fair_estimate_min: number;
  fair_estimate_max: number;
  verdict: Verdict;
  overcharge_amount: number;
  overcharge_percent: number;
  explanation: string;
  suspicious_items: string[];
}

// ─── Prices ───────────────────────────────────────────────────────────────────

export interface PriceSource {
  store: string;
  price: number;
  url: string;
  availability: string;
}

export interface PartPrice {
  name: string;
  sources: PriceSource[];
}

export interface PricesResponse {
  parts: PartPrice[];
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadAsset {
  uri: string;
  name: string;
  mimeType: string;
}

export interface ObdReading {
  codes: string[];
  diagnosisBoost: string;
  confidenceBoost: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Diagnosis:
    | {
        upload?: UploadAsset;
        inputType?: UploadType;
        diagnosisId?: string;
        obdReading?: ObdReading | null;
        carId?: string;
      }
    | undefined;
  Quote: { diagnosisId: string };
  Prices: { diagnosisId: string };
  OBD: undefined;
  OBDResult: undefined;
  HealthCheck: undefined;
  VIN: undefined;
  Chat: { sessionId?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  ChatHistory: undefined;
  History: undefined;
  Profile: undefined;
  VINTab: undefined;
};
