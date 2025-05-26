import { TenderResponse } from '@/services/ClaudeService';
import mongoose, { Document, Schema } from 'mongoose';
import { IAnalytics } from './Analytics';
import { IReport } from './Report';

interface IAnalyzedFile {
  analyzedFile: string;
  response: string;
}

export interface ITender extends Document {
  regNumber: string;
  tender: {
    ordinalNumber: number;
    name: string;
    beginPrice: number;
    publishDate: Date;
    endDate: Date;
    region: string;
    typeName: string;
    lotCategories?: string[];
    files: string;
    module: string;
    etpLink: string;
    customers: Array<{
      lotCustomerShortName: string;
    }>;
  };
  claudeResponse: TenderResponse | null;
  analyzedFiles: IAnalyzedFile[];
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
  findRequests: {
    itemName: string;
    findRequest: string[];
    parsedRequest: {
      requestName: string;
      responseFromWebsites: {
        title: string;
        snippet: string;
        link: string;
        content?: string;
      }[];
    }[];
  }[];
  analytics: IAnalytics | null;
  reports: IReport[] | null;
}

const TenderSchema = new Schema<ITender>(
  {
    regNumber: { type: String, required: true },
    tender: {
      ordinalNumber: { type: Number, required: true },
      name: { type: String, required: true },
      beginPrice: { type: Number, required: true },
      publishDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      region: { type: String, required: true },
      typeName: { type: String, required: true },
      lotCategories: [{ type: String }],
      files: { type: String, required: true },
      module: { type: String, required: true },
      etpLink: { type: String, required: true },
      customers: [
        {
          lotCustomerShortName: { type: String, required: true },
        },
      ],
    },
    isProcessed: { type: Boolean, default: false },
    analyzedFiles: [
      {
        analyzedFile: { type: String, required: true },
        response: { type: String, required: true },
      },
    ],
    analytics: {
      type: Schema.Types.ObjectId,
      ref: 'Analytics',
      default: null,
    },
    reports: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Report',
        default: null,
      },
    ],
    claudeResponse: {
      type: Object,
      default: null,
    },
    findRequests: [
      {
        itemName: { type: String, required: true },
        findRequest: { type: Array, required: true },
        parsedRequest: [
          {
            requestName: { type: String, required: true },
            responseFromWebsites: [
              {
                title: { type: String, required: true },
                snippet: { type: String, required: true },
                link: { type: String, required: true },
                content: { type: String },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

TenderSchema.index({ regNumber: 1, ordinalNumber: 1 }, { unique: true });

export const Tender = mongoose.model<ITender>('Tender', TenderSchema);
