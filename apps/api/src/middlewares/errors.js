import mongoose from 'mongoose';
import multer from 'multer';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const notFound = (req, _res, next) => {
  next(new AppError(`No existe la ruta ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

const normaliseError = (error) => {
  if (error instanceof AppError) return error;

  if (error?.type === 'entity.parse.failed') {
    return new AppError('El cuerpo JSON no es válido', 400, 'INVALID_JSON');
  }

  if (error?.status === 413 || error?.type === 'entity.too.large') {
    return new AppError('El cuerpo de la petición es demasiado grande', 413, 'PAYLOAD_TOO_LARGE');
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('La imagen supera el límite de 5 MB', 413, 'FILE_TOO_LARGE');
    }
    return new AppError('No se pudo procesar el archivo', 400, 'UPLOAD_ERROR');
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(
      'Los datos no cumplen el modelo',
      422,
      'MODEL_VALIDATION_ERROR',
      Object.values(error.errors).map((entry) => ({ field: entry.path, message: entry.message })),
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError('El identificador no es válido', 400, 'INVALID_ID');
  }

  if (error?.code === 11000) {
    return new AppError(
      'Ya existe un registro con esos datos',
      409,
      'DUPLICATE_RESOURCE',
      error.keyValue,
    );
  }

  return error;
};

export const errorHandler = (rawError, req, res, _next) => {
  const error = normaliseError(rawError);
  const statusCode = error.statusCode ?? 500;
  const isOperational = error instanceof AppError;
  const body = {
    success: false,
    error: {
      code: isOperational ? error.code : 'INTERNAL_ERROR',
      message:
        statusCode === 500 && env.nodeEnv === 'production'
          ? 'Ha ocurrido un error inesperado'
          : error.message,
    },
  };

  if (isOperational && error.details) body.error.details = error.details;
  if (env.nodeEnv !== 'production' && statusCode === 500) body.error.stack = error.stack;

  req.log?.error({ err: rawError, statusCode }, 'request failed');
  res.status(statusCode).json(body);
};
