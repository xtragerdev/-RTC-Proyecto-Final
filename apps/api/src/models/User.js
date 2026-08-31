import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { ROLES, ROLE_VALUES } from '../constants/domain.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    externalCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.MEMBER, index: true },
    district: { type: String, trim: true, maxlength: 80 },
    preferredHub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    avatar: { type: imageSchema, default: undefined },
    favoriteItems: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
      default: [],
      validate: {
        validator(values) {
          return new Set(values.map(String)).size === values.length;
        },
        message: 'No se permiten objetos favoritos duplicados',
      },
    },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    lifecycleVersion: { type: Number, min: 0, default: 0, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, object) {
        delete object.password;
        delete object.lifecycleVersion;
        object.id = object._id.toString();
        return object;
      },
    },
  },
);

userSchema.index({ role: 1, active: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
