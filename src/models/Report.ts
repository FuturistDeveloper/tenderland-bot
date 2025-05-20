import crypto from 'crypto';
import { model, Schema } from "mongoose";

export interface IReport {
    id: string;
    title: string;
    type: 'TENDER' | 'CONTRACTOR' | 'PRODUCT' | 'ANALYTICS';
    content: string;
    metadata: {
        startDate?: Date;
        endDate?: Date;
        filters?: Record<string, any>;
        generatedBy: string;
    };
    format: 'PDF' | 'EXCEL' | 'CSV';
    status: 'PENDING' | 'GENERATED' | 'FAILED';
    downloadUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const reportSchema = new Schema<IReport>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID(),
    },
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['TENDER', 'CONTRACTOR', 'PRODUCT', 'ANALYTICS'],
    },
    content: {
        type: String,
        required: true,
    },
    metadata: {
        startDate: Date,
        endDate: Date,
        filters: Schema.Types.Mixed,
        generatedBy: {
            type: String,
            required: true,
        },
    },
    format: {
        type: String,
        required: true,
        enum: ['PDF', 'EXCEL', 'CSV'],
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'GENERATED', 'FAILED'],
        default: 'PENDING',
    },
    downloadUrl: String,
}, { timestamps: true });

export const Report = model<IReport>('Report', reportSchema); 