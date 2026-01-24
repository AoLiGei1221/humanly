import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { AIChatRequest, AILogQueryFilters, AIContentModification } from '@humory/shared';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

/**
 * Send a chat message to AI assistant
 * POST /api/v1/ai/chat
 */
export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { documentId, sessionId, message, context } = req.body;

  if (!documentId) {
    throw new AppError(400, 'Document ID is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new AppError(400, 'Message is required');
  }

  const request: AIChatRequest = {
    documentId,
    sessionId,
    message: message.trim(),
    context,
  };

  const response = await AIService.chat(userId, request);

  res.json({
    success: true,
    data: response,
  });
}

/**
 * Get AI interaction logs for a document
 * GET /api/v1/ai/logs
 */
export async function getLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { documentId } = req.query;

  if (!documentId || typeof documentId !== 'string') {
    throw new AppError(400, 'Document ID is required');
  }

  const filters: Omit<AILogQueryFilters, 'documentId' | 'userId'> = {
    queryType: req.query.queryType as any,
    status: req.query.status as any,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
  };

  const result = await AIService.getLogs(userId, documentId, filters);

  res.json({
    success: true,
    data: result.logs,
    pagination: {
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hasMore: (filters.offset || 0) + result.logs.length < result.total,
    },
  });
}

/**
 * Get a specific AI interaction log
 * GET /api/v1/ai/logs/:logId
 */
export async function getLog(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { logId } = req.params;

  if (!logId) {
    throw new AppError(400, 'Log ID is required');
  }

  const log = await AIService.getLog(userId, logId);

  res.json({
    success: true,
    data: log,
  });
}

/**
 * Apply an AI suggestion
 * POST /api/v1/ai/apply-suggestion
 */
export async function applySuggestion(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { logId, suggestionId, modification } = req.body;

  if (!logId) {
    throw new AppError(400, 'Log ID is required');
  }

  if (!suggestionId) {
    throw new AppError(400, 'Suggestion ID is required');
  }

  if (!modification || !modification.type || !modification.before || !modification.after) {
    throw new AppError(400, 'Valid modification data is required');
  }

  const modificationData: AIContentModification = {
    id: suggestionId,
    type: modification.type,
    before: modification.before,
    after: modification.after,
    location: modification.location || { startOffset: 0, endOffset: 0 },
    timestamp: new Date(),
  };

  const log = await AIService.applySuggestion(userId, logId, suggestionId, modificationData);

  res.json({
    success: true,
    data: log,
  });
}

/**
 * Get chat sessions for a document
 * GET /api/v1/ai/sessions/:documentId
 */
export async function getSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { documentId } = req.params;

  if (!documentId) {
    throw new AppError(400, 'Document ID is required');
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const sessions = await AIService.getSessions(userId, documentId, limit);

  res.json({
    success: true,
    data: sessions,
  });
}

/**
 * Get a specific chat session with messages
 * GET /api/v1/ai/sessions/detail/:sessionId
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { sessionId } = req.params;

  if (!sessionId) {
    throw new AppError(400, 'Session ID is required');
  }

  const session = await AIService.getSession(userId, sessionId);

  res.json({
    success: true,
    data: session,
  });
}

/**
 * Close a chat session
 * DELETE /api/v1/ai/sessions/:sessionId
 */
export async function closeSession(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { sessionId } = req.params;

  if (!sessionId) {
    throw new AppError(400, 'Session ID is required');
  }

  await AIService.closeSession(userId, sessionId);

  res.json({
    success: true,
    message: 'Session closed',
  });
}
