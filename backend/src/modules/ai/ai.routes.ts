import { Router } from 'express';
import { AIController } from './ai.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { saveAISettingSchema, sendMessageSchema } from './ai.schemas';
import { upload } from '../../middleware/upload.middleware';

const router = Router();
const controller = new AIController();

router.use(authenticate);

router.get('/settings', controller.getSettings);
router.post('/settings', validateRequest(saveAISettingSchema), controller.saveSettings);

router.get('/conversations', controller.listConversations);
router.post('/conversations', controller.createConversation);
router.delete('/conversations/:id', controller.deleteConversation);

router.get('/conversations/:id/messages', controller.getMessages);
router.post('/conversations/:id/messages', validateRequest(sendMessageSchema), controller.sendMessage);
router.post('/conversations/:id/messages/stream', validateRequest(sendMessageSchema), controller.streamMessage);

// Dedicated Study Tool Features
router.post('/features/summarize-pdf', upload.single('file'), controller.summarizePDF);
router.post('/features/ocr-image', upload.single('file'), controller.ocrImage);
router.post('/features/study-planner', controller.generateStudyPlan);
router.post('/features/assignment-assistant', controller.assignmentAssistant);
router.post('/features/revision-notes', controller.generateRevisionNotes);
router.post('/features/flashcards', controller.generateFlashcards);
router.post('/features/quiz', controller.generateQuiz);
router.post('/features/project-assistant', controller.projectAssistant);

export default router;

