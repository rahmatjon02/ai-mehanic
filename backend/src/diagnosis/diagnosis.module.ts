import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiService } from '../common/ai.service';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisService } from './diagnosis.service';

@Module({
  imports: [AuthModule],
  controllers: [DiagnosisController],
  providers: [DiagnosisService, AiService],
  exports: [DiagnosisService],
})
export class DiagnosisModule {}
