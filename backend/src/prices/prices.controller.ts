import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { successResponse } from '../common/response.util';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
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
