import { Module } from '@nestjs/common';
import { DiagnosisModule } from '../diagnosis/diagnosis.module';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

@Module({
  imports: [DiagnosisModule],
  controllers: [PricesController],
  providers: [PricesService],
})
export class PricesModule {}
