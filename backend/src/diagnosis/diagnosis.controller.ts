import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
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
import { DiagnosisService } from './diagnosis.service';
import { buildStoredFileName, detectFileType } from '../common/file.util';
import { successResponse } from '../common/response.util';

@ApiTags('Diagnosis')
@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @ApiOperation({ summary: 'Analyze uploaded car photo, audio, or video' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['image', 'audio', 'video'],
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Diagnosis created successfully.' })
  @Post('analyze')
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
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    detectFileType(file.mimetype, type);
    const data = await this.diagnosisService.analyze(file, type);
    return successResponse(data);
  }

  @ApiOperation({ summary: 'Get recent diagnoses' })
  @Get()
  async list(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return successResponse(await this.diagnosisService.list(limit ?? 20));
  }

  @ApiOperation({ summary: 'Get diagnosis by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return successResponse(await this.diagnosisService.findById(id));
  }
}
