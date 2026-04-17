import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { buildStoredFileName } from '../common/file.util';
import { successResponse } from '../common/response.util';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Create a new AI chat session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Noise from brakes' },
      },
    },
  })
  @Post('sessions')
  async createSession(
    @CurrentUser() user: JwtUser,
    @Body('title') title?: string,
  ) {
    return successResponse(
      await this.chatService.createSession(user.id, title),
    );
  }

  @ApiOperation({ summary: 'List AI chat sessions for current user' })
  @ApiQuery({ name: 'limit', required: false })
  @Get('sessions')
  async listSessions(
    @CurrentUser() user: JwtUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return successResponse(await this.chatService.listSessions(user.id, limit));
  }

  @ApiOperation({ summary: 'Get one AI chat session with messages' })
  @ApiParam({ name: 'id', required: true })
  @Get('sessions/:id')
  async getSession(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return successResponse(await this.chatService.getSession(user.id, id));
  }

  @ApiOperation({ summary: 'Send message to AI chat session' })
  @ApiParam({ name: 'id', required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          example: 'My car makes a grinding sound when braking.',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('sessions/:id/messages')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads',
        filename: (_req, file, callback) => {
          callback(null, buildStoredFileName(file.originalname));
        },
      }),
    }),
  )
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('content') content?: string,
  ) {
    if (!content?.trim() && !file) {
      throw new BadRequestException('Message or file is required');
    }

    return successResponse(
      await this.chatService.sendMessage({
        userId: user.id,
        sessionId: id,
        content,
        file,
      }),
    );
  }

  @ApiOperation({ summary: 'Delete AI chat session' })
  @ApiParam({ name: 'id', required: true })
  @Delete('sessions/:id')
  async deleteSession(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return successResponse(await this.chatService.deleteSession(user.id, id));
  }
}
