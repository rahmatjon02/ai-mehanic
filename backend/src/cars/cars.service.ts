import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCarDto {
  vin?: string;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  engineSize?: string;
}

@Injectable()
export class CarsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCarDto) {
    return this.prisma.car.create({
      data: { ...dto, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.car.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const car = await this.prisma.car.findUnique({ where: { id } });

    if (!car) {
      throw new NotFoundException('Машина не найдена');
    }

    if (car.userId !== userId) {
      throw new ForbiddenException('Доступ запрещён');
    }

    await this.prisma.car.delete({ where: { id } });
    return { id };
  }
}
