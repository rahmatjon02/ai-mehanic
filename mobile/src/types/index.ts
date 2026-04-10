export type Severity = 'low' | 'medium' | 'high';
export type Verdict = 'fair' | 'overpriced' | 'underpriced';
export type UploadType = 'image' | 'audio' | 'video';

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
}

export interface DiagnosisDetail {
  id: string;
  fileType: UploadType;
  filePath: string;
  createdAt: string;
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

export type RootStackParamList = {
  MainTabs: undefined;
  Diagnosis:
    | {
        upload?: UploadAsset;
        inputType?: UploadType;
        diagnosisId?: string;
        obdReading?: ObdReading | null;
      }
    | undefined;
  Quote: {
    diagnosisId: string;
  };
  Prices: {
    diagnosisId: string;
  };
  OBD: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
};
