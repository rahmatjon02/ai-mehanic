import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiService } from '../common/ai.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, AiService],
})
export class ChatModule {}
