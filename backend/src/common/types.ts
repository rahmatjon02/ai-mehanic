export type SeverityLevel = 'low' | 'medium' | 'high';
export type QuoteVerdict = 'fair' | 'overpriced' | 'underpriced';

export interface PartEstimate {
  name: string;
  price_min: number;
  price_max: number;
  currency: string;
}

export interface DiagnosisResult {
  problem: string;
  description: string;
  severity: SeverityLevel;
  parts_needed: PartEstimate[];
  labor_cost_min: number;
  labor_cost_max: number;
  total_cost_min: number;
  total_cost_max: number;
  confidence: number;
}

export interface QuoteComparisonResult {
  mechanic_total: number;
  fair_estimate_min: number;
  fair_estimate_max: number;
  verdict: QuoteVerdict;
  overcharge_amount: number;
  overcharge_percent: number;
  explanation: string;
  suspicious_items: string[];
}

export type ChatRole = 'user' | 'assistant';

export interface ChatPromptMessage {
  role: ChatRole;
  content: string;
}
