import { Hub } from '../models/Hub.js';
import { User } from '../models/User.js';
import { deleteImage, uploadBuffer } from '../services/cloudinaryService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { signAccessToken } from '../utils/jwt.js';

export const register = async (req, res) => {
  const input = req.validated.body;
  if (input.preferredHub && !(await Hub.exists({ _id: input.preferredHub, active: true }))) {
    throw new AppError(
      'El nodo preferido no existe o no está activo',
      422,
      'INVALID_PREFERRED_HUB',
    );
  }

  let avatar;
  if (req.file) avatar = await uploadBuffer(req.file.buffer, 'avatars');

  try {
    const user = await User.create({ ...input, role: 'member', avatar, active: true });
    const token = signAccessToken(user._id.toString());
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Cuenta creada correctamente',
      data: { user, token },
    });
  } catch (error) {
    if (avatar?.publicId) await deleteImage(avatar.publicId);
    throw error;
  }
};

export const login = async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email, active: true }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS');
  }

  const token = signAccessToken(user._id.toString());
  user.password = undefined;
  return sendSuccess(res, { message: 'Sesión iniciada', data: { user, token } });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('preferredHub', 'name slug district image')
    .populate('favoriteItems', 'name slug image category status');
  return sendSuccess(res, { data: user });
};
