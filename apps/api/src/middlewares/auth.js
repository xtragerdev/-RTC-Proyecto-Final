import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

const extractBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

const resolveUser = async (req, required) => {
  const token = extractBearerToken(req);
  if (!token) {
    if (required) throw new AppError('Debes iniciar sesión', 401, 'AUTH_REQUIRED');
    return null;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    if (required) throw new AppError('La sesión no es válida o ha caducado', 401, 'INVALID_TOKEN');
    return null;
  }

  const user = await User.findOne({ _id: payload.sub, active: true });
  if (!user) {
    if (required) throw new AppError('La cuenta ya no está activa', 401, 'INACTIVE_ACCOUNT');
    return null;
  }

  req.user = user;
  return user;
};

export const requireAuth = async (req, _res, next) => {
  try {
    await resolveUser(req, true);
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    await resolveUser(req, false);
    next();
  } catch (error) {
    next(error);
  }
};

export const allowRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para realizar esta acción', 403, 'FORBIDDEN'));
    }
    return next();
  };
