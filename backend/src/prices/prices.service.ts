import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DiagnosisService } from '../diagnosis/diagnosis.service';

interface TjsPriceEntry {
  min: number;
  max: number;
  stores: string[];
}

let pricesCache: Record<string, TjsPriceEntry> | null = null;

function loadPrices(): Record<string, TjsPriceEntry> {
  if (pricesCache) return pricesCache;
  const filePath = join(__dirname, 'tajikistan-prices.json');
  pricesCache = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, TjsPriceEntry>;
  return pricesCache;
}

function findBestMatch(
  partName: string,
  prices: Record<string, TjsPriceEntry>,
): TjsPriceEntry | null {
  const lower = partName.toLowerCase().trim();

  // Exact match
  if (prices[lower]) return prices[lower];

  // Partial match — find the key whose words overlap most
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const key of Object.keys(prices)) {
    const keyWords = key.split(/\s+/);
    const nameWords = lower.split(/\s+/);
    const overlap = keyWords.filter((w) => nameWords.some((n) => n.includes(w) || w.includes(n))).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestKey = key;
    }
  }

  return bestScore > 0 && bestKey ? prices[bestKey] : null;
}

@Injectable()
export class PricesService {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  async getPrices(diagnosisId: string) {
    const diagnosis = await this.diagnosisService.getStoredDiagnosis(diagnosisId);
    const tjsPrices = loadPrices();

    return {
      parts: diagnosis.result.parts_needed.map((part, index) => {
        const match = findBestMatch(part.name, tjsPrices);

        const baseMin = match ? match.min : Math.round(part.price_min * 11);
        const baseMax = match ? match.max : Math.round(part.price_max * 11);
        const stores = match
          ? match.stores
          : ['Авторынок Шохмансур', 'Автодетали Душанбе', 'МагазинАвто'];

        const offsets = [15, 0, -20];
        const sources = stores.map((store, i) => {
          const rawPrice = Math.round(baseMin + ((baseMax - baseMin) / 2) + offsets[i] + index * 5);
          return {
            store,
            price: Math.max(rawPrice, Math.round(baseMin * 0.9)),
            currency: 'TJS',
            availability: i === 2 ? 'Доставка 2 дня' : 'В наличии',
          };
        });

        return {
          name: part.name,
          sources,
        };
      }),
    };
  }
}
