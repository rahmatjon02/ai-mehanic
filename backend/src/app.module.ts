import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { ChatModule } from './chat/chat.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { HealthModule } from './health/health.module';
import { PricesModule } from './prices/prices.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuoteModule } from './quote/quote.module';
import { UsersModule } from './users/users.module';
import { VinModule } from './vin/vin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChatModule,
    DiagnosisModule,
    QuoteModule,
    PricesModule,
    VinModule,
    CarsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
