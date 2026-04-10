import { Module } from '@nestjs/common';
import { AiService } from '../common/ai.service';
import { DiagnosisModule } from '../diagnosis/diagnosis.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [DiagnosisModule],
  controllers: [QuoteController],
  providers: [QuoteService, AiService],
})
export class QuoteModule {}
