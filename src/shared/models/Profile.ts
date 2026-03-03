import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileLink {
  label: string;
  url: string;
}

export interface IProfile extends Document {
  userId: string;
  username: string;
  displayName: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_reveal';
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  links?: IProfileLink[];
  isVerified: boolean;
  subscriberCount: number;
  totalViews: number;
  totalLikes: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileLinkSchema = new Schema<IProfileLink>(
  {
    label: { type: String, required: true, maxlength: 30 },
    url: { type: String, required: true, maxlength: 500 },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_reveal'],
      default: 'prefer_not_to_reveal',
    },
    avatar: {
      type: String,
    },
    banner: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    location: {
      type: String,
      maxlength: 100,
    },
    links: {
      type: [ProfileLinkSchema],
      default: [],
      validate: {
        validator: (v: IProfileLink[]) => v.length <= 5,
        message: 'Maximum 5 links allowed',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    subscriberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLikes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Username must be alphanumeric with underscores only
ProfileSchema.path('username').validate({
  validator: (v: string) => /^[a-zA-Z0-9_]+$/.test(v),
  message: 'Username can only contain letters, numbers, and underscores',
});

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
