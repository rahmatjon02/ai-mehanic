import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { successResponse } from '../common/response.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CarsService } from './cars.service';

@ApiTags('Cars')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @ApiOperation({ summary: 'Сохранить машину в профиль' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['make', 'model', 'year'],
      properties: {
        vin: { type: 'string' },
        make: { type: 'string', example: 'Toyota' },
        model: { type: 'string', example: 'Camry' },
        year: { type: 'number', example: 2020 },
        bodyType: { type: 'string' },
        engineSize: { type: 'string' },
      },
    },
  })
  @Post()
  async create(
    @CurrentUser() user: JwtUser,
    @Body('vin') vin?: string,
    @Body('make') make?: string,
    @Body('model') model?: string,
    @Body('year') year?: string,
    @Body('bodyType') bodyType?: string,
    @Body('engineSize') engineSize?: string,
  ) {
    if (!make || !model || !year) {
      throw new BadRequestException('make, model и year обязательны');
    }

    return successResponse(
      await this.carsService.create(user.id, {
        vin,
        make,
        model,
        year: Number(year),
        bodyType,
        engineSize,
      }),
    );
  }

  @ApiOperation({ summary: 'Список машин пользователя' })
  @Get()
  async findAll(@CurrentUser() user: JwtUser) {
    return successResponse(await this.carsService.findAll(user.id));
  }

  @ApiOperation({ summary: 'Удалить машину' })
  @ApiParam({ name: 'id', required: true })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return successResponse(await this.carsService.remove(id, user.id));
  }
}
