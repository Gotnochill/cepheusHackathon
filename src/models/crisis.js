import mongoose from 'mongoose';

const crisisSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'Crisis' },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  severity: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  description: String,
  affectedAreas: [String],
});

crisisSchema.index({ location: '2dsphere' });

const Crisis = mongoose.model('Crisis', crisisSchema, 'crises');
export default Crisis;
