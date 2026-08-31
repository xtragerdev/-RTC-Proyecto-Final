import mongoose from 'mongoose';

import { RESERVATION_STATUSES } from '../constants/domain.js';

const reservationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'requested',
      index: true,
    },
    memberNote: { type: String, trim: true, maxlength: 500 },
    managerNote: { type: String, trim: true, maxlength: 500 },
    requestedAt: { type: Date, default: Date.now },
    collectedAt: { type: Date },
    returnedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, object) {
        object.id = object._id.toString();
        return object;
      },
    },
  },
);

reservationSchema.pre('validate', function validateDateRange() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'La fecha de fin debe ser posterior a la de inicio');
  }
});

reservationSchema.index({ item: 1, startDate: 1, endDate: 1, status: 1 });
reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ hub: 1, status: 1, startDate: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
