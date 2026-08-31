import mongoose from 'mongoose';

const hubSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    district: { type: String, required: true, trim: true, index: true },
    neighborhood: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 800 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
            return value.length === 2;
          },
          message: 'Las coordenadas deben contener longitud y latitud',
        },
      },
    },
    openingHours: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
    lifecycleVersion: { type: Number, min: 0, default: 0, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, object) {
        delete object.lifecycleVersion;
        object.id = object._id.toString();
        object.coordinates = object.location?.coordinates;
        return object;
      },
    },
  },
);

hubSchema.index({ location: '2dsphere' });
hubSchema.index({ name: 'text', district: 'text', description: 'text' });
hubSchema.index({ managers: 1, active: 1 });

export const Hub = mongoose.model('Hub', hubSchema);
