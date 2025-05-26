import crypto from 'crypto';
import { model, Schema } from 'mongoose';

export interface IAnalytics {
  id: string;
  type: 'TENDER' | 'CONTRACTOR' | 'PRODUCT';
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalCount: number;
    totalValue: number;
    averageValue: number;
    successRate: number;
    categoryDistribution?: Record<string, number>;
    timeDistribution?: Record<string, number>;
  };
  insights: string[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const analyticsSchema = new Schema<IAnalytics>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    type: {
      type: String,
      required: true,
      enum: ['TENDER', 'CONTRACTOR', 'PRODUCT'],
    },
    period: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    metrics: {
      totalCount: {
        type: Number,
        required: true,
      },
      totalValue: {
        type: Number,
        required: true,
      },
      averageValue: {
        type: Number,
        required: true,
      },
      successRate: {
        type: Number,
        required: true,
      },
      categoryDistribution: {
        type: Schema.Types.Mixed,
      },
      timeDistribution: {
        type: Schema.Types.Mixed,
      },
    },
    insights: [
      {
        type: String,
        required: true,
      },
    ],
    recommendations: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true },
);

export const Analytics = model<IAnalytics>('Analytics', analyticsSchema);
