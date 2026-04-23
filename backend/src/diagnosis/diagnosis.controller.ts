import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { buildStoredFileName, detectFileType } from '../common/file.util';
import { successResponse } from '../common/response.util';
import { DiagnosisService } from './diagnosis.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'text/plain',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@ApiTags('Diagnosis')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @ApiOperation({ summary: 'Анализ загруженного фото, аудио или видео' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'type', required: true, enum: ['image', 'audio', 'video'] })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Диагноз успешно создан.' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads',
        filename: (_req, file, callback) => {
          callback(null, buildStoredFileName(file.originalname));
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async analyze(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: jpg, png, mp3, mp4, wav',
      );
    }

    detectFileType(file.mimetype, type);
    const data = await this.diagnosisService.analyze(file, type, user.id);
    return successResponse(data);
  }

  @ApiOperation({ summary: 'Список диагностик текущего пользователя' })
  @Get()
  async list(
    @CurrentUser() user: JwtUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return successResponse(
      await this.diagnosisService.list(limit ?? 20, user.id),
    );
  }

  @ApiOperation({ summary: 'Получить диагностику по ID' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.diagnosisService.findById(id);

    if (result.userId && result.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return successResponse(result);
  }
}
