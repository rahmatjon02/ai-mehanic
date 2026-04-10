import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Backend health check' })
  @ApiOkResponse({
    description: 'Returns backend status.',
    schema: {
      example: {
        success: true,
        data: {
          name: 'AI Mechanic Backend',
          status: 'ok',
        },
      },
    },
  })
  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        name: 'AI Mechanic Backend',
        status: 'ok',
      },
    };
  }
}
