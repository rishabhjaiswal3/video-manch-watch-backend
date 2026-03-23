import mongoose, { Schema } from 'mongoose';

const AppConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    playerUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export const AppConfig = mongoose.models.AppConfig || mongoose.model('AppConfig', AppConfigSchema);
