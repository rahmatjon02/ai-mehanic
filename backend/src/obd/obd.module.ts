import { Module } from '@nestjs/common';
import { ObdController } from './obd.controller';

@Module({
  controllers: [ObdController],
})
export class ObdModule {}
