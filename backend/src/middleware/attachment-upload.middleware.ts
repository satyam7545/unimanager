import multer from 'multer';

// Store uploaded files in memory so we can save them with custom logic and handle database transactions safely
const storage = multer.memoryStorage();

export const attachmentUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
