import { prisma } from '../../utils/prisma';
import { AISetting, Conversation, Message } from '@prisma/client';

export class AIRepository {
  async getSettings(userId: string): Promise<AISetting | null> {
    return prisma.aISetting.findFirst({
      where: { userId },
    });
  }

  async upsertSettings(
    userId: string,
    data: {
      provider: string;
      apiKey?: string | null;
      endpoint?: string | null;
      model?: string | null;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string | null;
    }
  ): Promise<AISetting> {
    const existing = await this.getSettings(userId);

    if (existing) {
      return prisma.aISetting.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return prisma.aISetting.create({
        data: {
          userId,
          provider: data.provider,
          apiKey: data.apiKey,
          endpoint: data.endpoint,
          model: data.model,
          temperature: data.temperature ?? 0.7,
          maxTokens: data.maxTokens ?? 2048,
          systemPrompt: data.systemPrompt,
        },
      });
    }
  }

  async createConversation(userId: string, provider: string, model: string): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        userId,
        provider,
        model,
      },
    });
  }

  async listConversations(userId: string): Promise<any[]> {
    return prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversationById(id: string, userId: string): Promise<Conversation | null> {
    return prisma.conversation.findFirst({
      where: { id, userId },
    });
  }

  async deleteConversation(id: string, _userId: string): Promise<Conversation> {
    return prisma.conversation.delete({
      where: { id },
    });
  }

  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: {
        conversationId,
        conversation: { userId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          role,
          content,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
        },
      }),
    ]);
    return message;
  }
}
