import mongoose from 'mongoose';

export const itemSelector = (identifier) => {
  if (mongoose.isValidObjectId(identifier)) return { _id: identifier };

  const demoMatch = identifier.match(/^item-(?:itm-)?0*(\d+)$/i);
  const code = demoMatch ? `ITM-${demoMatch[1].padStart(6, '0')}` : identifier.toUpperCase();

  return {
    $or: [{ slug: identifier.toLowerCase() }, { code }],
  };
};
