import { AIRepository } from './ai.repository';
import { prisma } from '../../utils/prisma';
import { Message } from '@prisma/client';
import pdfParse from 'pdf-parse';

export class AIService {
  private aiRepository = new AIRepository();

  async getSettings(userId: string) {
    const settings = await this.aiRepository.getSettings(userId);
    if (!settings) {
      return {
        provider: 'openai',
        apiKey: '',
        endpoint: '',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: 'You are UniManager Assistant, a helpful AI tutor integrated into the student workspace. Assist students with notes, assignments, planning, and academic work.',
      };
    }

    // Mask API Key for security when sending to frontend
    return {
      ...settings,
      apiKey: settings.apiKey ? `${settings.apiKey.substring(0, 6)}...${settings.apiKey.substring(settings.apiKey.length - 4)}` : '',
    };
  }

  async saveSettings(userId: string, data: any) {
    const existing = await this.aiRepository.getSettings(userId);

    let apiKey = data.apiKey;
    // If apiKey is masked (e.g. contains '...'), keep the old key
    if (apiKey && apiKey.includes('...') && existing) {
      apiKey = existing.apiKey;
    }

    return this.aiRepository.upsertSettings(userId, {
      provider: data.provider,
      apiKey: apiKey || null,
      endpoint: data.endpoint || null,
      model: data.model || null,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      systemPrompt: data.systemPrompt || null,
    });
  }

  async listConversations(userId: string) {
    const convs = await this.aiRepository.listConversations(userId);
    return convs.map((c) => ({
      id: c.id,
      provider: c.provider,
      model: c.model,
      updatedAt: c.updatedAt,
      lastMessage: c.messages[0] ? c.messages[0].content : 'No messages yet.',
    }));
  }

  async createConversation(userId: string) {
    const settings = await this.aiRepository.getSettings(userId);
    const provider = settings?.provider || 'openai';

    let defaultModel = 'gpt-4o-mini';
    if (provider === 'gemini') defaultModel = 'gemini-1.5-flash';
    else if (provider === 'claude') defaultModel = 'claude-3-5-sonnet-20240620';
    else if (provider === 'deepseek') defaultModel = 'deepseek-chat';
    else if (provider === 'ollama') defaultModel = 'llama3';
    else if (provider === 'lmstudio') defaultModel = 'local-model';

    const model = settings?.model || defaultModel;

    return this.aiRepository.createConversation(userId, provider, model);
  }

  async deleteConversation(id: string, userId: string) {
    const conversation = await this.aiRepository.findConversationById(id, userId);
    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }
    return this.aiRepository.deleteConversation(id, userId);
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.aiRepository.findConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }
    return this.aiRepository.getMessages(conversationId, userId);
  }

  async sendMessage(userId: string, conversationId: string, content: string, includeRag: boolean): Promise<Message> {
    const conversation = await this.aiRepository.findConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // 1. Persist User Message
    await this.aiRepository.createMessage(conversationId, 'USER', content);

    // 2. Fetch User AI Settings
    const settings = await this.aiRepository.getSettings(userId);
    const provider = settings?.provider || 'openai';
    const rawApiKey = settings?.apiKey || '';
    const temp = settings?.temperature ?? 0.7;
    const maxToks = settings?.maxTokens ?? 2048;
    const systemPrompt = settings?.systemPrompt || 'You are UniManager Assistant, a helpful AI tutor integrated into the student workspace.';

    // Resolve API Key from DB or env fallback
    let apiKey = rawApiKey;
    if (!apiKey) {
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
      else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
      else if (provider === 'claude') apiKey = process.env.ANTHROPIC_API_KEY || '';
      else if (provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    // Check mock mode trigger
    const isMock = apiKey.toLowerCase() === 'mock' || provider.toLowerCase() === 'mock' || (!apiKey && ['openai', 'gemini', 'claude', 'deepseek'].includes(provider));

    // 3. Compile history of messages for prompt context
    const rawHistory = await this.aiRepository.getMessages(conversationId, userId);

    // Select last 10 messages to keep context window clean
    const recentHistory = rawHistory.slice(-10);

    // 4. Retrieve RAG context if enabled
    const currentDate = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });
    let combinedSystemPrompt = `${systemPrompt}\n\n[CURRENT DATE & TIME: ${currentDate}]`;
    let ragContext = '';
    if (includeRag) {
      ragContext = await this.extractRagContext(userId, content);
      if (ragContext) {
        combinedSystemPrompt += `\n\n[CONTEXT FROM THE USER'S WORKSPACE (Use this to answer questions accurately and specifically):]\n${ragContext}`;
      }
    }

    // 5. Call AI Endpoint
    let assistantReply = '';
    if (isMock) {
      assistantReply = `[Sandbox/Mock Mode] Thank you for your question! Here is a mock response because you configured 'mock' as your API key, or no API credentials were found in your settings.

Your message was: "${content}"

Workspace Context:
${ragContext || 'None'}

If you want real AI completions, please configure a valid API key (for OpenAI, Gemini, Claude, or DeepSeek) or start a local LLM server (Ollama or LM Studio) in the AI Settings dashboard.`;
    } else {
      assistantReply = await this.callLLMProvider(
        provider,
        apiKey,
        settings?.endpoint || null,
        conversation.model,
        recentHistory,
        temp,
        maxToks,
        combinedSystemPrompt
      );
    }

    // 6. Save Assistant Reply
    return this.aiRepository.createMessage(conversationId, 'ASSISTANT', assistantReply);
  }

  async streamMessage(
    userId: string,
    conversationId: string,
    content: string,
    includeRag: boolean,
    onChunk: (chunk: string) => void
  ): Promise<Message> {
    const conversation = await this.aiRepository.findConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // 1. Persist User Message
    await this.aiRepository.createMessage(conversationId, 'USER', content);

    // 2. Fetch User AI Settings
    const settings = await this.aiRepository.getSettings(userId);
    const provider = settings?.provider || 'openai';
    const rawApiKey = settings?.apiKey || '';
    const temp = settings?.temperature ?? 0.7;
    const maxToks = settings?.maxTokens ?? 2048;
    const systemPrompt = settings?.systemPrompt || 'You are UniManager Assistant, a helpful AI tutor integrated into the student workspace.';

    // Resolve API Key from DB or env fallback
    let apiKey = rawApiKey;
    if (!apiKey) {
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
      else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
      else if (provider === 'claude') apiKey = process.env.ANTHROPIC_API_KEY || '';
      else if (provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    // Check mock mode trigger
    const isMock = apiKey.toLowerCase() === 'mock' || provider.toLowerCase() === 'mock' || (!apiKey && ['openai', 'gemini', 'claude', 'deepseek'].includes(provider));

    // 3. Compile history of messages for prompt context
    const rawHistory = await this.aiRepository.getMessages(conversationId, userId);

    // Select last 10 messages to keep context window clean
    const recentHistory = rawHistory.slice(-10);

    // 4. Retrieve RAG context if enabled
    const currentDate = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });
    let combinedSystemPrompt = `${systemPrompt}\n\n[CURRENT DATE & TIME: ${currentDate}]`;
    let ragContext = '';
    if (includeRag) {
      ragContext = await this.extractRagContext(userId, content);
      if (ragContext) {
        combinedSystemPrompt += `\n\n[CONTEXT FROM THE USER'S WORKSPACE (Use this to answer questions accurately and specifically):]\n${ragContext}`;
      }
    }

    // 5. Stream LLM Provider completions
    let assistantReply = '';
    const chunkCollector = (chunk: string) => {
      assistantReply += chunk;
      onChunk(chunk);
    };

    if (isMock) {
      const mockReply = `[Sandbox/Mock Mode] Thank you for your question! Here is a mock response because you configured 'mock' as your API key, or no API credentials were found in your settings.

Your message was: "${content}"

Workspace Context:
${ragContext || 'None'}

If you want real AI completions, please configure a valid API key (for OpenAI, Gemini, Claude, or DeepSeek) or start a local LLM server (Ollama or LM Studio) in the AI Settings dashboard.`;
      
      const chunks = mockReply.match(/.{1,8}/g) || [mockReply];
      for (const chunk of chunks) {
        chunkCollector(chunk);
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    } else {
      await this.streamLLMProvider(
        provider,
        apiKey,
        settings?.endpoint || null,
        conversation.model,
        recentHistory,
        temp,
        maxToks,
        combinedSystemPrompt,
        chunkCollector
      );
    }

    // 6. Save Assistant Reply to Database
    return this.aiRepository.createMessage(conversationId, 'ASSISTANT', assistantReply);
  }

  // Local RAG Search Context Extraction
  private async extractRagContext(userId: string, prompt: string): Promise<string> {
    const keywords = this.extractKeywords(prompt);

    const lowerPrompt = prompt.toLowerCase();
    const wantsAssignments = lowerPrompt.includes('assignment') || lowerPrompt.includes('homework') || lowerPrompt.includes('due') || lowerPrompt.includes('deadline');
    const wantsTasks = lowerPrompt.includes('task') || lowerPrompt.includes('todo') || lowerPrompt.includes('planner') || lowerPrompt.includes('plan');
    const wantsNotes = lowerPrompt.includes('note') || lowerPrompt.includes('lecture') || lowerPrompt.includes('obsidian') || lowerPrompt.includes('study');
    const wantsProjects = lowerPrompt.includes('project') || lowerPrompt.includes('github') || lowerPrompt.includes('git') || lowerPrompt.includes('kanban');
    const wantsEvents = lowerPrompt.includes('event') || lowerPrompt.includes('calendar') || lowerPrompt.includes('schedule') || lowerPrompt.includes('exam') || lowerPrompt.includes('class') || lowerPrompt.includes('session');
    const wantsHabits = lowerPrompt.includes('habit') || lowerPrompt.includes('routine') || lowerPrompt.includes('streak');

    let contextStr = '';

    // Fetch and format User's Course Subjects list
    const subjects = await prisma.subject.findMany({
      where: { userId },
      select: { name: true, color: true, semester: true }
    });

    if (subjects.length > 0) {
      contextStr += '\n--- YOUR COURSE SUBJECTS ---\n';
      subjects.forEach(s => {
        contextStr += `- Subject: ${s.name} (Semester: ${s.semester || 'General'})\n`;
      });
    }

    // Search Notes
    const notesToFetch = wantsNotes ? 5 : (keywords.length > 0 ? 3 : 0);
    if (notesToFetch > 0) {
      const matchingNotes = await prisma.note.findMany({
        where: {
          userId,
          OR: keywords.length > 0 ? [
            ...keywords.map(kw => ({ title: { contains: kw } })),
            ...keywords.map(kw => ({ content: { contains: kw } })),
            ...keywords.map(kw => ({ subject: { name: { contains: kw } } }))
          ] : undefined,
        },
        orderBy: { updatedAt: 'desc' },
        take: notesToFetch,
        include: { subject: true },
      });

      if (matchingNotes.length > 0) {
        contextStr += '\n--- RELATED NOTES ---\n';
        matchingNotes.forEach(n => {
          contextStr += `Note: ${n.title} (Subject: ${n.subject?.name || 'General'})\n`;
          contextStr += `Content: ${n.content.substring(0, 3000)}${n.content.length > 3000 ? '...' : ''}\n\n`;
        });
      }
    }

    // Search Assignments
    const assignmentsToFetch = wantsAssignments ? 5 : (keywords.length > 0 ? 3 : 0);
    if (assignmentsToFetch > 0) {
      const matchingAssignments = await prisma.assignment.findMany({
        where: {
          userId,
          status: wantsAssignments && keywords.length === 0 ? { not: 'COMPLETED' } : undefined,
          OR: keywords.length > 0 ? [
            ...keywords.map(kw => ({ title: { contains: kw } })),
            ...keywords.map(kw => ({ description: { contains: kw } })),
            ...keywords.map(kw => ({ subject: { name: { contains: kw } } }))
          ] : undefined,
        },
        orderBy: { deadline: 'asc' },
        take: assignmentsToFetch,
        include: { subject: true },
      });

      if (matchingAssignments.length > 0) {
        contextStr += '\n--- RELATED ASSIGNMENTS ---\n';
        matchingAssignments.forEach(a => {
          contextStr += `- Assignment: ${a.title} | Status: ${a.status} | Priority: ${a.priority} | Due: ${a.deadline.toISOString().split('T')[0]} | Subject: ${a.subject?.name || 'General'}\n`;
          if (a.description) contextStr += `  Description: ${a.description}\n`;
        });
      }
    }

    // Search Projects
    const projectsToFetch = wantsProjects ? 5 : (keywords.length > 0 ? 3 : 0);
    if (projectsToFetch > 0) {
      const matchingProjects = await prisma.project.findMany({
        where: {
          userId,
          OR: keywords.length > 0 ? [
            ...keywords.map(kw => ({ name: { contains: kw } })),
            ...keywords.map(kw => ({ description: { contains: kw } }))
          ] : undefined,
        },
        orderBy: { updatedAt: 'desc' },
        take: projectsToFetch,
      });

      if (matchingProjects.length > 0) {
        contextStr += '\n--- RELATED PROJECTS ---\n';
        matchingProjects.forEach(p => {
          contextStr += `- Project: ${p.name} | Completion Progress: ${p.progress}%\n`;
          if (p.description) contextStr += `  Description: ${p.description}\n`;
        });
      }
    }

    // Search Tasks / Planner items
    const tasksToFetch = wantsTasks ? 10 : (keywords.length > 0 ? 5 : 0);
    if (tasksToFetch > 0) {
      const matchingTasks = await prisma.task.findMany({
        where: {
          userId,
          status: wantsTasks && keywords.length === 0 ? { not: 'DONE' } : undefined,
          OR: keywords.length > 0 ? keywords.map(kw => ({ title: { contains: kw } })) : undefined,
        },
        orderBy: { updatedAt: 'desc' },
        take: tasksToFetch,
      });

      if (matchingTasks.length > 0) {
        contextStr += '\n--- RELATED PLANNER TASKS ---\n';
        matchingTasks.forEach(t => {
          const dateStr = t.date ? ` | Scheduled: ${t.date.toISOString().split('T')[0]}` : '';
          contextStr += `- [${t.status === 'DONE' ? 'x' : ' '}] ${t.title} (Status: ${t.status} | Priority: ${t.priority}${dateStr})\n`;
        });
      }
    }

    // Search Events / Calendar items
    const eventsToFetch = wantsEvents ? 10 : (keywords.length > 0 ? 5 : 0);
    if (eventsToFetch > 0) {
      const matchingEvents = await prisma.event.findMany({
        where: {
          userId,
          OR: keywords.length > 0 ? [
            ...keywords.map(kw => ({ title: { contains: kw } })),
            ...keywords.map(kw => ({ description: { contains: kw } })),
            ...keywords.map(kw => ({ subject: { name: { contains: kw } } }))
          ] : undefined,
          startAt: wantsEvents && keywords.length === 0 ? { gte: new Date() } : undefined,
        },
        orderBy: { startAt: 'asc' },
        take: eventsToFetch,
        include: { subject: true },
      });

      if (matchingEvents.length > 0) {
        contextStr += '\n--- RELATED CALENDAR EVENTS ---\n';
        matchingEvents.forEach(e => {
          contextStr += `- Event: ${e.title} | Start: ${e.startAt.toISOString()} | End: ${e.endAt.toISOString()}${e.isAllDay ? ' (All Day)' : ''} | Subject: ${e.subject?.name || 'General'}\n`;
          if (e.description) contextStr += `  Description: ${e.description}\n`;
        });
      }
    }

    // Search Habits
    const habitsToFetch = wantsHabits ? 10 : (keywords.length > 0 ? 3 : 0);
    if (habitsToFetch > 0) {
      const matchingHabits = await prisma.habit.findMany({
        where: {
          userId,
          OR: keywords.length > 0 ? keywords.map(kw => ({ name: { contains: kw } })) : undefined,
        },
        include: {
          logs: {
            orderBy: { completedAt: 'desc' },
            take: 7,
          }
        },
        take: habitsToFetch,
      });

      if (matchingHabits.length > 0) {
        contextStr += '\n--- RELATED HABITS ---\n';
        matchingHabits.forEach(h => {
          contextStr += `- Habit: ${h.name} | Frequency: ${h.frequency} | Target completions: ${h.target} | Recent completions (last 7 days): ${h.logs.length}\n`;
        });
      }
    }

    return contextStr.trim();
  }

  private extractKeywords(prompt: string): string[] {
    const clean = prompt.toLowerCase().replace(/[^\w\s]/g, '');
    const words = clean.split(/\s+/);

    const stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
      'can', 'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
      'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed',
      'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows',
      'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most',
      'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
      'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some',
      'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these',
      'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
      'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
      'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
      'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
      'write', 'create', 'make', 'generate', 'show', 'list', 'explain', 'tell', 'summarize', 'find', 'search', 'get', 'help',
      'please', 'want', 'need', 'how', 'what', 'who', 'where', 'when', 'why'
    ]);

    return Array.from(new Set(words.filter(w => w.length >= 2 && !stopWords.has(w))));
  }

  // LLM Dispatcher
  private async callLLMProvider(
    provider: string,
    apiKey: string,
    customEndpoint: string | null,
    model: string,
    history: Message[],
    temperature: number,
    maxTokens: number,
    systemPrompt: string
  ): Promise<string> {

    let url = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = {};

    // Map openai, deepseek, gemini, ollama, lmstudio to OpenAI-compatible formats
    if (provider === 'openai') {
      url = customEndpoint || 'https://api.openai.com/v1/chat/completions';
      if (!apiKey) throw new Error('OpenAI API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gpt-4o-mini',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
      };
    } else if (provider === 'gemini') {
      // Use Gemini OpenAI-compatible completions endpoint
      url = customEndpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      if (!apiKey) throw new Error('Gemini API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gemini-1.5-flash',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
      };
    } else if (provider === 'deepseek') {
      url = customEndpoint || 'https://api.deepseek.com/chat/completions';
      if (!apiKey) throw new Error('DeepSeek API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'deepseek-chat',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
      };
    } else if (provider === 'ollama') {
      const baseEndpoint = customEndpoint || 'http://127.0.0.1:11434/v1/chat/completions';
      const resolvedModel = await this.getOllamaModelFallback(baseEndpoint, model || 'llama3');
      url = baseEndpoint;
      body = {
        model: resolvedModel,
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
      };
    } else if (provider === 'lmstudio') {
      url = customEndpoint || 'http://127.0.0.1:1234/v1/chat/completions';
      body = {
        model: model || 'local-model',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
      };
    } else if (provider === 'claude') {
      url = customEndpoint || 'https://api.anthropic.com/v1/messages';
      if (!apiKey) throw new Error('Anthropic API Key is missing. Please configure it in AI Settings.');
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: model || 'claude-3-5-sonnet-20240620',
        temperature,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: history.map(h => ({
          role: h.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
      };
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Provider HTTP Error (${response.status}): ${errText || response.statusText}`);
      }

      const resJson = await response.json() as any;

      if (provider === 'claude') {
        const content = resJson?.content?.[0]?.text;
        if (!content) throw new Error('Anthropic response did not contain message text.');
        return content;
      } else {
        const content = resJson?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Response did not contain chat completions content.');
        return content;
      }
    } catch (e: any) {
      throw new Error(`LLM execution failed: ${e.message}`);
    }
  }

  private async streamLLMProvider(
    provider: string,
    apiKey: string,
    customEndpoint: string | null,
    model: string,
    history: Message[],
    temperature: number,
    maxTokens: number,
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    let url = '';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = {};

    // Map openai, deepseek, gemini, ollama, lmstudio to OpenAI-compatible formats
    if (provider === 'openai') {
      url = customEndpoint || 'https://api.openai.com/v1/chat/completions';
      if (!apiKey) throw new Error('OpenAI API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gpt-4o-mini',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
        stream: true,
      };
    } else if (provider === 'gemini') {
      url = customEndpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      if (!apiKey) throw new Error('Gemini API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'gemini-1.5-flash',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
        stream: true,
      };
    } else if (provider === 'deepseek') {
      url = customEndpoint || 'https://api.deepseek.com/chat/completions';
      if (!apiKey) throw new Error('DeepSeek API Key is missing. Please configure it in AI Settings.');
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || 'deepseek-chat',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
        stream: true,
      };
    } else if (provider === 'ollama') {
      const baseEndpoint = customEndpoint || 'http://127.0.0.1:11434/v1/chat/completions';
      const resolvedModel = await this.getOllamaModelFallback(baseEndpoint, model || 'llama3');
      url = baseEndpoint;
      body = {
        model: resolvedModel,
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
        stream: true,
      };
    } else if (provider === 'lmstudio') {
      url = customEndpoint || 'http://127.0.0.1:1234/v1/chat/completions';
      body = {
        model: model || 'local-model',
        temperature,
        max_tokens: maxTokens,
        messages: this.formatMessagesForOpenAI(systemPrompt, history),
        stream: true,
      };
    } else if (provider === 'claude') {
      url = customEndpoint || 'https://api.anthropic.com/v1/messages';
      if (!apiKey) throw new Error('Anthropic API Key is missing. Please configure it in AI Settings.');
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: model || 'claude-3-5-sonnet-20240620',
        temperature,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: history.map(h => ({
          role: h.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
        stream: true,
      };
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Provider HTTP Error (${response.status}): ${errText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty, cannot stream.');
      }

      let buffer = '';
      const decoder = new TextDecoder('utf-8');

      if (typeof (response.body as any).getReader === 'function') {
        const reader = (response.body as any).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value || new Uint8Array(), { stream: true });
          buffer = this.parseSseBuffer(provider, buffer, onChunk);
        }
      } else if (typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response.body as any) {
          const chunkStr = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
          buffer += chunkStr;
          buffer = this.parseSseBuffer(provider, buffer, onChunk);
        }
      } else {
        throw new Error('Response body is not a readable stream.');
      }
    } catch (e: any) {
      throw new Error(`LLM streaming execution failed: ${e.message}`);
    }
  }

  private parseSseBuffer(provider: string, buffer: string, onChunk: (chunk: string) => void): string {
    const lines = buffer.split('\n');
    const leftover = lines.pop() || ''; // Keep the last incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (provider === 'claude') {
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              onChunk(parsed.delta.text);
            }
          } else {
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              onChunk(content);
            }
          }
        } catch (e) {
          // Ignore parse errors on partial stream lines
        }
      }
    }

    return leftover;
  }

  private formatMessagesForOpenAI(systemPrompt: string, history: Message[]) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    history.forEach(h => {
      messages.push({
        role: h.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    });
    return messages;
  }

  private async getOllamaModelFallback(endpoint: string | null, requestedModel: string): Promise<string> {
    let host = 'http://127.0.0.1:11434';
    if (endpoint) {
      try {
        const parsed = new URL(endpoint);
        host = `${parsed.protocol}//${parsed.host}`;
      } catch (err) {
        // Fallback to default host
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${host}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = (await response.json()) as { models?: Array<{ name: string }> };
        if (data.models && data.models.length > 0) {
          const names = data.models.map((m) => m.name);

          // 1. Exact match
          if (names.includes(requestedModel)) return requestedModel;

          // 2. Exact match with tag appended
          if (!requestedModel.includes(':') && names.includes(`${requestedModel}:latest`)) {
            return `${requestedModel}:latest`;
          }

          // 3. Prefix match (e.g. "llama3.2" matches "llama3.2:latest")
          const cleanRequested = requestedModel.split(':')[0];
          const prefixMatch = names.find((n) => n.startsWith(`${cleanRequested}:`) || n === cleanRequested);
          if (prefixMatch) return prefixMatch;

          // 4. Fuzzy inclusion match
          const fuzzyMatch = names.find((n) => n.toLowerCase().includes(cleanRequested.toLowerCase()));
          if (fuzzyMatch) return fuzzyMatch;

          // 5. Fallback to first available model
          return names[0];
        }
      }
    } catch (e) {
      // Fallback silently if Ollama is unreachable
    }
    return requestedModel;
  }

  // --- Study Tools Support completions ---

  private async executeDirectCompletion(
    userId: string,
    systemPrompt: string,
    userPrompt: string,
    isJsonExpected: boolean = false
  ): Promise<string> {
    const settings = await this.aiRepository.getSettings(userId);
    const provider = settings?.provider || 'openai';
    const rawApiKey = settings?.apiKey || '';
    const temp = settings?.temperature ?? 0.7;
    const maxToks = settings?.maxTokens ?? 2048;

    let apiKey = rawApiKey;
    if (!apiKey) {
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
      else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
      else if (provider === 'claude') apiKey = process.env.ANTHROPIC_API_KEY || '';
      else if (provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    const isMock = apiKey.toLowerCase() === 'mock' || provider.toLowerCase() === 'mock' || (!apiKey && ['openai', 'gemini', 'claude', 'deepseek'].includes(provider));

    if (isMock) {
      if (isJsonExpected) {
        if (systemPrompt.includes('quiz')) {
          return JSON.stringify([
            {
              question: "What is the primary function of the Operating System kernel?",
              options: ["Manage system resources and hardware", "Render user interface graphics", "Compile source code files", "Send network requests"],
              answer: "Manage system resources and hardware",
              explanation: "The kernel manages CPU, memory, and devices, sitting at the core of the OS."
            },
            {
              question: "Which scheduling algorithm is non-preemptive and selects the process with the shortest CPU burst first?",
              options: ["Round Robin", "Shortest Job First (SJF)", "First Come First Served", "Priority Scheduling"],
              answer: "Shortest Job First (SJF)",
              explanation: "Non-preemptive SJF runs processes to completion based on their burst length."
            }
          ]);
        }
        if (systemPrompt.includes('flashcard')) {
          return JSON.stringify([
            { front: "Process", back: "An active instance of a running program containing program code and current activity." },
            { front: "Thread", back: "The smallest sequence of programmed instructions that can be managed independently by a scheduler." },
            { front: "Virtual Memory", back: "A memory management technique that uses secondary storage to act as primary RAM memory." }
          ]);
        }
        if (systemPrompt.includes('assignment') || systemPrompt.includes('project')) {
          return JSON.stringify([
            { title: "Review guidelines and rubric specifications", priority: "HIGH" },
            { title: "Design the logic flow and pseudo-code modules", priority: "MEDIUM" },
            { title: "Write initial implementation functions", priority: "MEDIUM" },
            { title: "Execute verification tests and debug failures", priority: "HIGH" },
            { title: "Write up final report documentation and submit", priority: "LOW" }
          ]);
        }
        if (systemPrompt.includes('plan')) {
          return JSON.stringify([
            { time: "09:00 - 10:30", activity: "Study Operating Systems (Focus: Scheduling algorithms)", priority: "HIGH" },
            { time: "11:00 - 12:30", activity: "Code Project repository modules", priority: "MEDIUM" },
            { time: "14:00 - 15:30", activity: "Review assignments pending deadlines", priority: "MEDIUM" }
          ]);
        }
      }

      return `[Sandbox/Mock Mode] This is a mock response analyzing your prompt.
      
- **Key Takeaway 1:** Organize your notes cleanly using folders.
- **Key Takeaway 2:** Leverage daily trackers to keep streaks active.
- **Recommendation:** Provide a real API key in settings to activate real LLM generation.`;
    }

    const history: Message[] = [
      {
        id: '1',
        role: 'USER',
        content: userPrompt,
        conversationId: 'direct',
        createdAt: new Date()
      }
    ];

    let defaultModel = 'gpt-4o-mini';
    if (provider === 'gemini') defaultModel = 'gemini-1.5-flash';
    else if (provider === 'claude') defaultModel = 'claude-3-5-sonnet-20240620';
    else if (provider === 'deepseek') defaultModel = 'deepseek-chat';
    else if (provider === 'ollama') defaultModel = 'llama3';
    else if (provider === 'lmstudio') defaultModel = 'local-model';

    const model = settings?.model || defaultModel;

    let response = await this.callLLMProvider(
      provider,
      apiKey,
      settings?.endpoint || null,
      model,
      history,
      temp,
      maxToks,
      systemPrompt
    );

    if (isJsonExpected) {
      response = response.trim();
      if (response.startsWith('```')) {
        response = response.replace(/^```[a-zA-Z]*\n/, '');
        response = response.replace(/\n```$/, '');
      }
      response = response.trim();
    }

    return response;
  }
  async summarizePDF(userId: string, file: Express.Multer.File): Promise<string> {
    let parsedText = '';
    if (pdfParse && typeof (pdfParse as any).PDFParse === 'function') {
      const uint8Array = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
      const parser = new ((pdfParse as any).PDFParse)(uint8Array);
      const pdfData = await parser.getText();
      parsedText = pdfData.text || '';
    } else {
      const parsePDF = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;
      const pdfData = await parsePDF(file.buffer);
      parsedText = pdfData.text || '';
    }
    if (!parsedText.trim()) {
      throw new Error('PDF file appears to be empty or contains only non-readable scanned images. Try running Image OCR on screenshots instead.');
    }

    const textSlice = parsedText.slice(0, 12000);
    const systemPrompt = "You are an expert academic tutor. Summarize the text extracted from the student's uploaded PDF file. Provide a structured summary containing: 1) A high-level overview, 2) Key study themes and definitions, 3) Detailed bullet points explaining core concepts, and 4) A glossary of important terms. Use markdown formatting with clear headers, bold text, and lists.";
    const userPrompt = `Here is the text extracted from the PDF document:\n\n${textSlice}\n\nSummarize this content thoroughly.`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, false);
  }

  async ocrImage(userId: string, file: Express.Multer.File): Promise<string> {
    const settings = await this.aiRepository.getSettings(userId);
    const provider = settings?.provider || 'openai';
    const rawApiKey = settings?.apiKey || '';

    let apiKey = rawApiKey;
    if (!apiKey) {
      if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
      else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
      else if (provider === 'claude') apiKey = process.env.ANTHROPIC_API_KEY || '';
      else if (provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    const isMock = apiKey.toLowerCase() === 'mock' || provider.toLowerCase() === 'mock' || (!apiKey && ['openai', 'gemini', 'claude', 'deepseek'].includes(provider));

    if (isMock) {
      return `[Sandbox/Mock OCR Mode] Extracted text from uploaded image (${file.originalname}):
      
" UniManager - By Satyam
All-in-One Student Operating System
1. Study Streak: 12 days
2. Pending Assignments: 3
3. Midterm exams are scheduled next week. Review DBMS and OS notes! "`;
    }

    const base64Image = file.buffer.toString('base64');
    const systemPrompt = "You are an expert OCR utility. Extract all text visible in the uploaded image. Output ONLY the extracted text, retaining paragraphs and list formats. Do not include introductory notes, conversational remarks, or code block backticks. If the image is handwritten, decipher the writing as accurately as possible.";

    if (['openai', 'gemini', 'claude'].includes(provider)) {
      let url = '';
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: any = {};

      let defaultModel = 'gpt-4o-mini';
      if (provider === 'gemini') defaultModel = 'gemini-1.5-flash';
      else if (provider === 'claude') defaultModel = 'claude-3-5-sonnet-20240620';

      const model = settings?.model || defaultModel;

      if (provider === 'openai') {
        url = settings?.endpoint || 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract the text from this image:' },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.mimetype};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        };
      } else if (provider === 'gemini') {
        url = settings?.endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        body = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract the text from this image:' },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.mimetype};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        };
      } else if (provider === 'claude') {
        url = settings?.endpoint || 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract the text from this image:' },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        };
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI Provider OCR HTTP Error (${response.status}): ${errText}`);
        }

        const resJson = await response.json() as any;
        if (provider === 'claude') {
          return resJson?.content?.[0]?.text || '';
        } else {
          return resJson?.choices?.[0]?.message?.content || '';
        }
      } catch (e: any) {
        throw new Error(`OCR extraction via LLM failed: ${e.message}`);
      }
    } else {
      throw new Error(`OCR is only supported natively for OpenAI, Google Gemini, and Anthropic Claude. Your current provider is set to: '${provider}'. Please update your AI settings to a multimodal cloud model to process images.`);
    }
  }

  async generateStudyPlan(userId: string, options: { availableHours: number; weakSubjects: string[]; examIds: string[] }): Promise<string> {
    const subjects = await prisma.subject.findMany({ where: { userId } });
    const exams = await prisma.event.findMany({
      where: {
        userId,
        title: { contains: 'exam' }
      }
    });

    const subjectsList = subjects.map(s => s.name).join(', ') || 'General subjects';
    const weakSubjectsStr = options.weakSubjects.join(', ') || 'None specified';
    const examsStr = exams.map(e => `${e.title} (on ${e.startAt.toISOString().split('T')[0]})`).join(', ') || 'No upcoming exams found';

    const systemPrompt = `You are a Smart Academic Scheduler. Design a personalized daily study timeline based on the student's active subjects, weak courses, and upcoming exams. 
IMPORTANT: Your output MUST be a valid JSON array, containing objects with exactly these fields: "time" (string, e.g. "09:00 - 10:30"), "activity" (string, describing the study task/focus), and "priority" (string, enum: "LOW", "MEDIUM", "HIGH"). 
Do NOT include any markdown code blocks, conversational text, or explanation before or after the JSON array. Output strictly valid JSON.`;

    const userPrompt = `Generate a daily study plan for a total of ${options.availableHours} available hours today.
- Student Subjects: ${subjectsList}
- Weak Subjects needing extra focus: ${weakSubjectsStr}
- Upcoming Exams to prepare for: ${examsStr}

Synthesize a list of 2-5 highly focused study blocks fitting within the available hours, prioritizing weak subjects and upcoming exam prep.`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, true);
  }

  async assignmentAssistant(userId: string, assignmentId: string): Promise<string> {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, userId },
      include: { subject: true }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const subjectName = assignment.subject?.name || 'General';

    const systemPrompt = `You are an Academic Assignment Decomposition Assistant. Break down the user's assignment into a logical sequence of smaller, bite-sized tasks.
IMPORTANT: Your output MUST be a valid JSON array of objects, containing exactly these fields: "title" (string, describing the task), and "priority" (string, enum: "LOW", "MEDIUM", "HIGH").
Do NOT include markdown formatting, backticks, or any conversational text. Output strictly valid JSON.`;

    const userPrompt = `Decompose this assignment:
- Title: ${assignment.title}
- Description: ${assignment.description || 'No additional description'}
- Course Subject: ${subjectName}
- Target Deadline: ${assignment.deadline.toISOString()}

Generate a sequence of 3-7 actionable subtasks (e.g. initial outline, drafting sections, review/proofreading) that the student can check off.`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, true);
  }

  async generateRevisionNotes(userId: string, options: { content?: string; noteId?: string }): Promise<string> {
    let textToAnalyze = options.content || '';

    if (options.noteId) {
      const note = await prisma.note.findFirst({
        where: { id: options.noteId, userId }
      });
      if (note) {
        textToAnalyze = `Note Title: ${note.title}\n\nNote Content:\n${note.content}`;
      }
    }

    if (!textToAnalyze.trim()) {
      throw new Error('No content was provided to generate revision notes.');
    }

    const systemPrompt = "You are an expert Revision Notes Generator. Condense the uploaded lecture, study guide, or student note text into concise, high-yield study revision notes. Organize the output cleanly using Markdown, including: 1) Executive Summary (2-3 sentences), 2) Bulleted key concepts and formulas, 3) Contrast/comparison tables where applicable, and 4) Quick-reference review FAQs. Keep it punchy and easily read.";
    const userPrompt = `Generate revision notes based on the following content:\n\n${textToAnalyze.slice(0, 15000)}`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, false);
  }

  async generateFlashcards(userId: string, options: { topic?: string; content?: string; noteId?: string }): Promise<string> {
    let textToAnalyze = options.content || options.topic || '';

    if (options.noteId) {
      const note = await prisma.note.findFirst({
        where: { id: options.noteId, userId }
      });
      if (note) {
        textToAnalyze = `Note Title: ${note.title}\n\nNote Content:\n${note.content}`;
      }
    }

    if (!textToAnalyze.trim()) {
      throw new Error('No content or topic was provided to generate flashcards.');
    }

    const systemPrompt = `You are a Flashcard Study Generator. Construct a list of Q&A-style flashcards based on the provided text.
IMPORTANT: Your output MUST be a valid JSON array of objects, containing exactly these fields: "front" (string, the question, definition term, or prompt), and "back" (string, the answer or explanation).
Do NOT include markdown markers, backticks, or any conversational remarks. Output strictly valid JSON.`;

    const userPrompt = `Create a deck of 3-10 flashcards from the following content:\n\n${textToAnalyze.slice(0, 12000)}`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, true);
  }

  async generateQuiz(userId: string, options: { topic?: string; content?: string; noteId?: string; questionCount: number }): Promise<string> {
    let textToAnalyze = options.content || options.topic || '';

    if (options.noteId) {
      const note = await prisma.note.findFirst({
        where: { id: options.noteId, userId }
      });
      if (note) {
        textToAnalyze = `Note Title: ${note.title}\n\nNote Content:\n${note.content}`;
      }
    }

    if (!textToAnalyze.trim()) {
      throw new Error('No content or topic was provided to generate a quiz.');
    }

    const systemPrompt = `You are an Academic Quiz Creator. Construct a multiple-choice practice quiz based on the provided content.
IMPORTANT: Your output MUST be a valid JSON array of objects, containing exactly these fields:
- "question" (string, the MCQ question)
- "options" (array of 4 strings, the possible answers)
- "answer" (string, matching EXACTLY one of the choices in the options array)
- "explanation" (string, explaining why the correct choice is right)
Do NOT include markdown markers, backticks, or any conversational remarks. Output strictly valid JSON.`;

    const userPrompt = `Generate a quiz with exactly ${options.questionCount} multiple-choice questions based on the following content:\n\n${textToAnalyze.slice(0, 12000)}`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, true);
  }

  async projectAssistant(userId: string, projectId: string): Promise<string> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const systemPrompt = `You are a Project Architecture and Task Assistant. Break down the user's project details into logical implementation milestones.
IMPORTANT: Your output MUST be a valid JSON array of objects, containing exactly these fields: "title" (string, describing the task), and "priority" (string, enum: "LOW", "MEDIUM", "HIGH", "URGENT").
Do NOT include markdown code block syntax, backticks, or conversational text. Output strictly valid JSON.`;

    const userPrompt = `Decompose this project into Kanban tasks:
- Name: ${project.name}
- Description: ${project.description || 'No description provided'}

Generate a logical breakdown of 4-8 tasks (e.g. Initial scoping, design schema, write setup, code testing, deploy) that the user can map directly to their board.`;

    return this.executeDirectCompletion(userId, systemPrompt, userPrompt, true);
  }
}
