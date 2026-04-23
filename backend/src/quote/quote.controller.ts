import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { buildStoredFileName } from '../common/file.util';
import { successResponse } from '../common/response.util';
import { QuoteService } from './quote.service';

@ApiTags('Quote')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @ApiOperation({
    summary: 'Compare mechanic quote against diagnosis estimate',
  })
  @ApiParam({ name: 'diagnosisId', required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        quoteText: {
          type: 'string',
          example: 'Brake job total 420',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Quote comparison completed.' })
  @Post('check/:diagnosisId')
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
  async checkQuote(
    @Param('diagnosisId') diagnosisId: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('quoteText') quoteText?: string,
  ) {
    if (!file && !quoteText) {
      throw new BadRequestException('Quote file or quoteText is required');
    }

    const data = await this.quoteService.checkQuote({
      diagnosisId,
      file,
      quoteText,
    });

    return successResponse(data);
  }
}
