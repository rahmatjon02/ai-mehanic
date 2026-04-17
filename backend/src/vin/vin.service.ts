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

const YEAR_CODES: Record<string, string> = {
  A: '2010',
  B: '2011',
  C: '2012',
  D: '2013',
  E: '2014',
  F: '2015',
  G: '2016',
  H: '2017',
  J: '2018',
  K: '2019',
  L: '2020',
  M: '2021',
  N: '2022',
  P: '2023',
  R: '2024',
  S: '2025',
  T: '2026',
  V: '2027',
  W: '2028',
  X: '2029',
  Y: '2030',
  '1': '2001',
  '2': '2002',
  '3': '2003',
  '4': '2004',
  '5': '2005',
  '6': '2006',
  '7': '2007',
  '8': '2008',
  '9': '2009',
};

const WMI_MAKES: Record<string, string> = {
  '1FA': 'Ford',
  '1FB': 'Ford',
  '1FC': 'Ford',
  '1FD': 'Ford',
  '1FM': 'Ford',
  '1FT': 'Ford',
  '1FU': 'Freightliner',
  '1GC': 'Chevrolet',
  '1G1': 'Chevrolet',
  '1G6': 'Cadillac',
  '1GM': 'Pontiac',
  '1HG': 'Honda',
  '1J4': 'Jeep',
  '1N4': 'Nissan',
  '2HG': 'Honda',
  '2T1': 'Toyota',
  '3FA': 'Ford',
  '3HG': 'Honda',
  '3N1': 'Nissan',
  '4T1': 'Toyota',
  '5TD': 'Toyota',
  '5YJ': 'Tesla',
  JHM: 'Honda',
  JN1: 'Nissan',
  JT2: 'Toyota',
  JTD: 'Toyota',
  KMH: 'Hyundai',
  KNA: 'Kia',
  KNM: 'Renault Samsung',
  SAL: 'Land Rover',
  WBA: 'BMW',
  WBS: 'BMW',
  WDB: 'Mercedes-Benz',
  WDD: 'Mercedes-Benz',
  WVW: 'Volkswagen',
  YV1: 'Volvo',
  ZFA: 'Fiat',
};

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
        'Неверный VIN: допустимы только латинские буквы кроме I, O, Q и цифры',
      );
    }

    const url = `https://vpic.api.nhtsa.dot.gov/api/vehicles/DecodeVin/${cleaned}?format=json`;
    let data: NhtsaDecodeResponse;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NHTSA API returned status ${response.status}`);
      }
      data = (await response.json()) as NhtsaDecodeResponse;
    } catch {
      return this.buildOfflineVinResult(cleaned);
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
      return this.buildOfflineVinResult(cleaned);
    }

    return {
      make,
      model: model || 'Неизвестно',
      year: year || 'Неизвестно',
      bodyType: bodyType || 'Неизвестно',
      engineSize: engineSize || 'Неизвестно',
    };
  }

  private buildOfflineVinResult(vin: string): VinResult {
    const make = WMI_MAKES[vin.slice(0, 3)];

    if (!make) {
      throw new BadRequestException(
        'VIN не распознан. Проверьте правильность ввода.',
      );
    }

    return {
      make,
      model: 'Неизвестно',
      year: YEAR_CODES[vin[9]] ?? 'Неизвестно',
      bodyType: 'Неизвестно',
      engineSize: 'Неизвестно',
    };
  }
}
