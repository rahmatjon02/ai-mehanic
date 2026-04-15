import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { successResponse } from '../common/response.util';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @ApiOperation({ summary: 'Get part prices for a diagnosis' })
  @ApiParam({ name: 'diagnosisId', required: true })
  @Get(':diagnosisId')
  async getPrices(@Param('diagnosisId') diagnosisId: string) {
    return successResponse(await this.pricesService.getPrices(diagnosisId));
  }
}
