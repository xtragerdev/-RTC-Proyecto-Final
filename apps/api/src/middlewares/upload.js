import multer from 'multer';

import { AppError } from '../utils/AppError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new AppError('Solo se admiten imágenes JPG, PNG o WebP', 415, 'UNSUPPORTED_MEDIA_TYPE'),
      );
      return;
    }
    callback(null, true);
  },
});
