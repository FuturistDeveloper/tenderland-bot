import crypto from 'crypto';
import { model, Schema } from "mongoose";

export interface IProduct {
    id: string;
    name: string;
    description: string;
    sku: string; // Stock Keeping Unit
    category: string;
    unit: string; // Unit of measurement (kg, pcs, etc.)
    price: number;
    currency: string;
    supplier: string; // Reference to Contractor
    createdAt: Date;
    updatedAt: Date;
}

export const productSchema = new Schema<IProduct>({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomUUID(),
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    sku: {
        type: String,
        required: true,
        unique: true,
    },
    category: {
        type: String,
        required: true,
    },
    unit: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
        default: 'RUB',
    },
    supplier: {
        type: String,
        required: true,
        ref: 'Contractor',
    },
}, { timestamps: true });

export const Product = model<IProduct>('Product', productSchema); 