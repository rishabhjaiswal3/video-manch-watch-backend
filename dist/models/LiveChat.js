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
exports.LiveChatMessage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LiveChatMessageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    streamId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    avatar: {
        type: String,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    type: {
        type: String,
        enum: ['message', 'system', 'donation', 'pinned'],
        default: 'message',
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Index for fetching chat messages for a stream (sorted by time)
LiveChatMessageSchema.index({ streamId: 1, createdAt: 1 });
// Index for fetching user's messages
LiveChatMessageSchema.index({ userId: 1, createdAt: -1 });
// Index for pinned messages
LiveChatMessageSchema.index({ streamId: 1, isPinned: 1 });
// TTL index to auto-delete old messages after 7 days
LiveChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
exports.LiveChatMessage = mongoose_1.default.model('LiveChatMessage', LiveChatMessageSchema);
//# sourceMappingURL=LiveChat.js.map