import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { successResponse } from '../common/response.util';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Full system health diagnostics' })
  @Get('diagnostics')
  async getDiagnostics() {
    return successResponse(await this.healthService.getDiagnostics());
  }
}
