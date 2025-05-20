import crypto from 'crypto';
import { model, Schema } from "mongoose";
import { IAnalytics } from './Analytics';
import { IReport } from './Report';

export interface ITender {
    id: string;
    title: string;
    description: string;
    analytics: IAnalytics;
    reports: IReport[];
    createdAt: Date;
    updatedAt: Date;
}

export const tenderSchema = new Schema<ITender>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID(),
    },
    title: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
    },
    analytics: {
        type: Schema.Types.ObjectId,
        ref: 'Analytics',
    },
    reports: [{
        type: Schema.Types.ObjectId,
        ref: 'Report',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

export const Tender = model<ITender>('Tender', tenderSchema);
