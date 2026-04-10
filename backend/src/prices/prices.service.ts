import { Injectable } from '@nestjs/common';
import { DiagnosisService } from '../diagnosis/diagnosis.service';

@Injectable()
export class PricesService {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  async getPrices(diagnosisId: string) {
    const diagnosis = await this.diagnosisService.getStoredDiagnosis(diagnosisId);

    return {
      parts: diagnosis.result.parts_needed.map((part, index) => {
        const basePrice = part.price_min;

        return {
          name: part.name,
          sources: [
            {
              store: 'AutoZone',
              price: Number((basePrice + 5 + index * 2).toFixed(2)),
              url: 'https://autozone.com',
              availability: 'In Stock',
            },
            {
              store: "O'Reilly",
              price: Number((basePrice + 2 + index * 2).toFixed(2)),
              url: 'https://oreillyauto.com',
              availability: 'In Stock',
            },
            {
              store: 'RockAuto',
              price: Number(Math.max(basePrice - 2, 1).toFixed(2)),
              url: 'https://rockauto.com',
              availability: 'Ships in 2 days',
            },
          ],
        };
      }),
    };
  }
}
