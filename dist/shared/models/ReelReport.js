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
exports.ReelReport = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ReelReportSchema = new mongoose_1.Schema({
    reportId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    videoId: {
        type: String,
        required: true,
        index: true,
    },
    reason: {
        type: String,
        enum: ['violence', 'hate', 'sexual', 'misinformation', 'spam', 'copyright', 'other'],
        required: true,
    },
    details: {
        type: String,
        maxlength: 2000,
        default: '',
    },
    source: {
        type: String,
        enum: ['reels'],
        required: true,
        default: 'reels',
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
        default: 'pending',
        index: true,
    },
    submittedAt: {
        type: Date,
    },
    reporterIp: {
        type: String,
        maxlength: 128,
    },
    reporterUserAgent: {
        type: String,
        maxlength: 512,
    },
}, { timestamps: true });
ReelReportSchema.index({ videoId: 1, createdAt: -1 });
ReelReportSchema.index({ reason: 1, createdAt: -1 });
exports.ReelReport = mongoose_1.default.model('ReelReport', ReelReportSchema);
//# sourceMappingURL=ReelReport.js.map