import { BadRequestException, Injectable } from '@nestjs/common';

export interface VinResult {
  make: string;
  model: string;
  year: string;
  bodyType: string;
  engineSize: string;
}

interface NhtsaDecodeResponse {
  Results?: Array<{
    Variable: string;
    Value: string | null;
  }>;
}

@Injectable()
export class VinService {
  async decode(vin: string): Promise<VinResult> {
    if (!vin || typeof vin !== 'string') {
      throw new BadRequestException('VIN обязателен');
    }

    const cleaned = vin.trim().toUpperCase();

    if (cleaned.length !== 17) {
      throw new BadRequestException(
        'Неверный VIN: должен содержать ровно 17 символов',
      );
    }

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
      throw new BadRequestException(
        'Неверный VIN: допустимы только латинские буквы (кроме I, O, Q) и цифры',
      );
    }

    const url = `https://vpic.api.nhtsa.dot.gov/api/vehicles/DecodeVin/${cleaned}?format=json`;
    let data: NhtsaDecodeResponse;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NHTSA API вернул статус ${response.status}`);
      }
      data = (await response.json()) as NhtsaDecodeResponse;
    } catch {
      throw new BadRequestException(
        'Не удалось подключиться к сервису NHTSA. Попробуйте позже.',
      );
    }

    const results = data.Results ?? [];

    const get = (variable: string): string => {
      const found = results.find((r) => r.Variable === variable);
      return found?.Value && found.Value !== 'Not Applicable'
        ? found.Value
        : '';
    };

    const make = get('Make');
    const model = get('Model');
    const year = get('Model Year');
    const bodyType = get('Body Class');
    const engineSize = get('Displacement (L)');

    if (!make) {
      throw new BadRequestException(
        'VIN не распознан. Проверьте правильность ввода.',
      );
    }

    return {
      make,
      model: model || 'Неизвестно',
      year: year || 'Неизвестно',
      bodyType: bodyType || 'Неизвестно',
      engineSize: engineSize || 'Неизвестно',
    };
  }
}
