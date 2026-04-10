import { Module } from '@nestjs/common';
import { AiService } from '../common/ai.service';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisService } from './diagnosis.service';

@Module({
  controllers: [DiagnosisController],
  providers: [DiagnosisService, AiService],
  exports: [DiagnosisService],
})
export class DiagnosisModule {}
