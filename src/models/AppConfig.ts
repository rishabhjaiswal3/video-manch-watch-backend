import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  playerUrl: string;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    key: { type: String, required: true, unique: true, index: true },
    playerUrl: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
