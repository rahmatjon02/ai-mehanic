import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { successResponse } from '../common/response.util';
import { VinService } from './vin.service';

@ApiTags('VIN')
@Controller('vin')
export class VinController {
  constructor(private readonly vinService: VinService) {}

  @ApiOperation({ summary: 'Декодировать VIN через NHTSA' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['vin'],
      properties: { vin: { type: 'string', example: '1HGBH41JXMN109186' } },
    },
  })
  @Post('decode')
  async decode(@Body('vin') vin: string) {
    if (!vin) {
      throw new BadRequestException('VIN обязателен');
    }
    return successResponse(await this.vinService.decode(vin));
  }
}
