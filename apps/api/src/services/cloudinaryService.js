import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const uploadBuffer = (buffer, subfolder = 'items') => {
  if (!cloudinaryEnabled) {
    throw new AppError('La subida de imágenes no está configurada', 503, 'UPLOAD_NOT_CONFIGURED');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.cloudinary.folder}/${subfolder}`,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          reject(new AppError('Cloudinary no pudo procesar la imagen', 502, 'UPLOAD_FAILED'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId) => {
  if (!publicId || !cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (error) {
    console.warn(`No se pudo eliminar la imagen ${publicId}: ${error.message}`);
  }
};
