import crypto from 'crypto';
import { model, Schema } from "mongoose";

export interface IContractor {
    id: string;
    name: string;
    inn: string; // Tax ID
    kpp: string; // Tax Registration Code
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export const contractorSchema = new Schema<IContractor>({
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
    inn: {
        type: String,
        required: true,
        unique: true,
    },
    kpp: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    contactPerson: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
}, { timestamps: true });

export const Contractor = model<IContractor>('Contractor', contractorSchema); 