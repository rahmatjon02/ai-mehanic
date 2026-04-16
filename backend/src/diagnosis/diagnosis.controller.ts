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
import {
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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { buildStoredFileName, detectFileType } from '../common/file.util';
import { successResponse } from '../common/response.util';
import { DiagnosisService } from './diagnosis.service';

@ApiTags('Diagnosis')
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
        carId: {
          type: 'string',
          description: 'ID сохранённой машины (необязательно)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Диагноз успешно создан.' })
  @Post('analyze')
  @UseGuards(OptionalJwtAuthGuard)
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
  async analyze(
    @UploadedFile() file?: Express.Multer.File,
    @Query('type') type?: string,
    @Body('carId') carId?: string,
    @CurrentUser() user?: JwtUser | null,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    detectFileType(file.mimetype, type);
    const data = await this.diagnosisService.analyze(
      file,
      type,
      user?.id,
      carId,
    );
    return successResponse(data);
  }

  @ApiOperation({ summary: 'Список диагностик текущего пользователя' })
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async list(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @CurrentUser() user?: JwtUser | null,
  ) {
    return successResponse(
      await this.diagnosisService.list(limit ?? 20, user?.id ?? undefined),
    );
  }

  @ApiOperation({ summary: 'Получить диагностику по ID' })
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user?: JwtUser | null) {
    const result = await this.diagnosisService.findById(id);

    // If the diagnosis belongs to another user → 403
    if (result.userId && result.userId !== user?.id) {
      throw new ForbiddenException('Access denied');
    }

    return successResponse(result);
  }
}
