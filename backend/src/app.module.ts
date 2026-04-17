import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { ChatModule } from './chat/chat.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { PricesModule } from './prices/prices.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuoteModule } from './quote/quote.module';
import { UsersModule } from './users/users.module';
import { VinModule } from './vin/vin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
