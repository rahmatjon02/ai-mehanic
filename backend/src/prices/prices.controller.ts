import { Controller, Get, Param } from '@nestjs/common';
import { successResponse } from '../common/response.util';
import { PricesService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get(':diagnosisId')
  async getPrices(@Param('diagnosisId') diagnosisId: string) {
    return successResponse(await this.pricesService.getPrices(diagnosisId));
  }
}
