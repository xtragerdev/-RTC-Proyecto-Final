import mongoose from 'mongoose';

import { ITEM_CATEGORIES, ITEM_CONDITIONS, ITEM_STATUSES } from '../constants/domain.js';

const itemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 1500 },
    category: { type: String, enum: ITEM_CATEGORIES, required: true, index: true },
    hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    condition: { type: String, enum: ITEM_CONDITIONS, default: 'good' },
    status: { type: String, enum: ITEM_STATUSES, default: 'available', index: true },
    depositEuros: { type: Number, min: 0, default: 0 },
    maxLoanDays: { type: Number, min: 1, max: 30, default: 7 },
    replacementCostEuros: { type: Number, min: 0, required: true },
    estimatedWasteKg: { type: Number, min: 0, default: 0 },
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    tags: { type: [String], default: [] },
    instructions: { type: String, trim: true, maxlength: 1200 },
    totalLoans: { type: Number, min: 0, default: 0 },
    acquiredAt: { type: Date },
    bookingVersion: { type: Number, min: 0, default: 0, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, object) {
        delete object.bookingVersion;
        object.id = object._id.toString();
        object.deposit = object.depositEuros;
        object.replacementCost = object.replacementCostEuros;
        return object;
      },
    },
  },
);

itemSchema.index({ name: 'text', description: 'text', tags: 'text' });
itemSchema.index({ hub: 1, category: 1, status: 1 });

export const Item = mongoose.model('Item', itemSchema);
