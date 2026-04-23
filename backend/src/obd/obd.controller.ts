import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { successResponse } from '../common/response.util';

const SCENARIOS = [
  { codes: ['P0300', 'P0301'], description: 'Пропуски зажигания в цилиндрах', severity: 'high', diagnosisBoost: 'Зафиксированы пропуски зажигания P0300/P0301', confidenceBoost: 0.15 },
  { codes: ['P0420'], description: 'Снижение эффективности катализатора', severity: 'medium', diagnosisBoost: 'Код P0420 — износ катализатора', confidenceBoost: 0.12 },
  { codes: ['P0171', 'P0174'], description: 'Бедная топливная смесь, проверьте форсунки', severity: 'medium', diagnosisBoost: 'P0171/P0174 — бедная смесь', confidenceBoost: 0.10 },
  { codes: ['P0128'], description: 'Термостат залип в открытом положении', severity: 'medium', diagnosisBoost: 'P0128 — двигатель не прогревается', confidenceBoost: 0.13 },
  { codes: ['P0340'], description: 'Неисправность датчика распредвала', severity: 'high', diagnosisBoost: 'P0340 — датчик распредвала даёт сбой', confidenceBoost: 0.14 },
  { codes: ['P0562'], description: 'Низкое напряжение бортовой сети', severity: 'medium', diagnosisBoost: 'P0562 — проверьте аккумулятор', confidenceBoost: 0.11 },
  { codes: [], description: 'Ошибок не обнаружено. Все системы в норме.', severity: 'none', diagnosisBoost: '', confidenceBoost: 0 },
];

@ApiTags('OBD')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('obd')
export class ObdController {
  @ApiOperation({ summary: 'Simulate OBD scan and return random diagnostic codes' })
  @ApiResponse({ status: 200, description: 'OBD scan result' })
  @Get('scan')
  scan() {
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const voltageNum = (11.8 + Math.random() * 2.4).toFixed(1);
    return successResponse({
      ...scenario,
      voltage: `${voltageNum}V`,
      protocol: 'ISO 15765-4 CAN',
      scannedAt: new Date().toISOString(),
    });
  }
}
