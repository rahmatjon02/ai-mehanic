import { Injectable } from '@nestjs/common';
import { AiService } from '../common/ai.service';
import { DiagnosisService } from '../diagnosis/diagnosis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuoteService {
  constructor(
    private readonly diagnosisService: DiagnosisService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async checkQuote(input: {
    diagnosisId: string;
    file?: Express.Multer.File;
    quoteText?: string;
  }) {
    const diagnosis = await this.diagnosisService.getStoredDiagnosis(input.diagnosisId);
    const result = await this.aiService.compareQuote({
      diagnosis: diagnosis.result,
      quoteText: input.quoteText,
      filePath: input.file?.path,
      mimeType: input.file?.mimetype,
    });

    await this.prisma.quote.create({
      data: {
        diagnosisId: input.diagnosisId,
        filePath: input.file?.path,
        mechanicTotal: result.mechanic_total,
        verdict: result.verdict,
        overchargeAmt: result.overcharge_amount,
        overchargePct: result.overcharge_percent,
        explanation: result.explanation,
        rawResult: JSON.stringify(result),
      },
    });

    return result;
  }
}
