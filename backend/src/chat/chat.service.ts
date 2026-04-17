import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiService } from '../common/ai.service';
import { ChatPromptMessage } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async createSession(userId: string, title?: string) {
    return this.prisma.chatSession.create({
      data: {
        userId,
        title: title?.trim() || 'Новый чат',
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async listSessions(userId: string, limit = 30) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastMessage: session.messages[0]?.content ?? null,
    }));
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Chat not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  async sendMessage(input: {
    userId: string;
    sessionId: string;
    content?: string;
    file?: Express.Multer.File;
  }) {
    const trimmed = input.content?.trim() ?? '';
    const session = await this.getSession(input.userId, input.sessionId);
    const fileType = this.getFileType(input.file?.mimetype);
    const displayContent =
      trimmed ||
      this.buildAttachmentMessage(input.file?.originalname, fileType);

    const userMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: displayContent,
        filePath: input.file?.path,
        fileName: input.file?.originalname,
        fileType,
        mimeType: input.file?.mimetype,
      },
    });

    const history: ChatPromptMessage[] = [
      ...session.messages.slice(-12).map(
        (message): ChatPromptMessage => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        }),
      ),
      {
        role: 'user' as const,
        content: input.file
          ? `${displayContent}\n\nПользователь прикрепил ${fileType ?? 'файл'}: ${input.file.originalname}.`
          : displayContent,
      },
    ];

    const assistantText = await this.aiService.generateChatReply(history);
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: assistantText,
      },
    });

    const shouldUpdateTitle =
      session.title === 'Новый чат' && session.messages.length === 0;

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        title: shouldUpdateTitle ? this.buildTitle(displayContent) : undefined,
      },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.getSession(userId, sessionId);

    return this.prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  private buildTitle(content: string) {
    const compact = content.replace(/\s+/g, ' ').trim();
    return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
  }

  private getFileType(mimeType?: string) {
    if (!mimeType) return undefined;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
  }

  private buildAttachmentMessage(fileName?: string, fileType?: string) {
    if (fileType === 'image') return `Прикреплено фото: ${fileName ?? 'image'}`;
    if (fileType === 'audio')
      return `Прикреплено аудио: ${fileName ?? 'audio'}`;
    if (fileType === 'video')
      return `Прикреплено видео: ${fileName ?? 'video'}`;
    return `Прикреплён файл: ${fileName ?? 'file'}`;
  }
}
