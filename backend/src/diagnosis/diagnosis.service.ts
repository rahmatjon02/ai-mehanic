import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../common/ai.service';
import { DiagnosisResult } from '../common/types';

@Injectable()
export class DiagnosisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async analyze(
    file: Express.Multer.File,
    explicitType?: string,
    userId?: string,
    carId?: string,
  ) {
    const fileType = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype.startsWith('audio/')
        ? 'audio'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : (explicitType as 'image' | 'audio' | 'video');

    const result = await this.aiService.analyzeDiagnosis({
      filePath: file.path,
      mimeType: file.mimetype,
      fileType,
    });

    const diagnosis = await this.prisma.diagnosis.create({
      data: {
        fileType,
        filePath: file.path,
        rawResult: JSON.stringify(result),
        problem: result.problem,
        description: result.description,
        severity: result.severity,
        totalMin: result.total_cost_min,
        totalMax: result.total_cost_max,
        userId: userId ?? null,
        carId: carId ?? null,
      },
    });

    return {
      diagnosisId: diagnosis.id,
      ...result,
    };
  }

  async list(limit = 20, userId?: string) {
    const where = userId ? { userId } : {};

    const diagnoses = await this.prisma.diagnosis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return diagnoses.map((d) => ({
      id: d.id,
      fileType: d.fileType,
      problem: d.problem,
      description: d.description,
      severity: d.severity,
      totalMin: d.totalMin,
      totalMax: d.totalMax,
      createdAt: d.createdAt,
      userId: d.userId,
      carId: d.carId,
    }));
  }

  async findById(id: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id },
      include: { quotes: true },
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnosis not found');
    }

    return {
      id: diagnosis.id,
      fileType: diagnosis.fileType,
      filePath: diagnosis.filePath,
      createdAt: diagnosis.createdAt,
      userId: diagnosis.userId,
      carId: diagnosis.carId,
      result: JSON.parse(diagnosis.rawResult) as DiagnosisResult,
      quotes: diagnosis.quotes,
    };
  }

  async getStoredDiagnosis(id: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id },
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnosis not found');
    }

    return {
      record: diagnosis,
      result: JSON.parse(diagnosis.rawResult) as DiagnosisResult,
    };
  }
}
