export const sendSuccess = (res, { statusCode = 200, message, data, meta } = {}) => {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};
