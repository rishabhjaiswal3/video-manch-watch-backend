"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProfileLinkSchema = new mongoose_1.Schema({
    label: { type: String, required: true, maxlength: 30 },
    url: { type: String, required: true, maxlength: 500 },
}, { _id: false });
const ProfileSchema = new mongoose_1.Schema({
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
            validator: (v) => v.length <= 5,
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
}, {
    timestamps: true,
});
// Username must be alphanumeric with underscores only
ProfileSchema.path('username').validate({
    validator: (v) => /^[a-zA-Z0-9_]+$/.test(v),
    message: 'Username can only contain letters, numbers, and underscores',
});
exports.Profile = mongoose_1.default.model('Profile', ProfileSchema);
//# sourceMappingURL=Profile.js.map