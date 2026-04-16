import { Module } from '@nestjs/common';
import { VinController } from './vin.controller';
import { VinService } from './vin.service';

@Module({
  controllers: [VinController],
  providers: [VinService],
})
export class VinModule {}
