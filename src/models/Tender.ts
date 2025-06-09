import mongoose, { Document, Schema } from 'mongoose';
import { TenderResponse } from '../types/tender';

export interface ITender extends Document {
  regNumber: string;
  tender: {
    ordinalNumber?: number;
    name: string;
    beginPrice: number;
    publishDate: string;
    endDate: string;
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
  responseFromFiles: TenderResponse | null;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
  findRequests: {
    itemName: string;
    findRequest: string[];
    parsedRequest: {
      requestName: string;
      responseFromWebsites?: {
        title: string;
        snippet: string;
        link: string;
        content?: string;
        html?: string | null;
      }[];
    }[];
    productAnalysis?: string;
  }[];
  finalReport: string | null;
}

const TenderSchema = new Schema<ITender>(
  {
    regNumber: { type: String, required: true },
    tender: {
      ordinalNumber: { type: Number, default: null },
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
    responseFromFiles: {
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
                html: { type: String || null },
              },
            ],
          },
        ],
        productAnalysis: { type: String, default: null },
      },
    ],
    finalReport: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

TenderSchema.index({ regNumber: 1, ordinalNumber: 1 }, { unique: true });

export const Tender = mongoose.model<ITender>('Tender', TenderSchema);
