import AdmZip from 'adm-zip';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { ENV } from "..";
import { Config } from '../config/config';
import { CreateTaskResponse, CreateTaskResponseSchema, TendersResponse, TendersResponseSchema } from '../schemas/tenderland.schema';
import { handleApiError } from '../utils/error-handler';

export class TenderlandService {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly axiosInstance: AxiosInstance;
    private readonly config: Config;

    constructor(config: Config) {
        this.config = config;
        this.baseUrl = 'https://tenderland.ru/api/v1';
        this.apiKey = ENV.TENDERLAND_API_KEY;
        
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
        });

        this.axiosInstance.interceptors.request.use((config) => {
            const separator = config.url?.includes('?') ? '&' : '?';
            config.url = `${config.url}${separator}apiKey=${this.apiKey}`;
            return config;
        });
    }

    async createTaskForGettingTenders(): Promise<CreateTaskResponse | undefined> {
        try {
            const response = await this.axiosInstance.get(
                `/Export/Create?autosearchId=${this.config.tenderland.autosearchId}&limit=${this.config.tenderland.limit}&batchSize=${this.config.tenderland.batchSize}&format=json`
            );
            return CreateTaskResponseSchema.parse(response.data);
        } catch (error) {
            handleApiError(error, 'createTaskForGettingTenders');
        }
    }

    async getTendersByTaskId(taskId: number): Promise<TendersResponse | undefined> {
        try {
            const response = await this.axiosInstance.get(`/Export/Get?exportId=${taskId}`);
            const data = TendersResponseSchema.parse(response.data);
            return data;
        } catch (error) {
            handleApiError(error, 'getTendersByTaskId');
        }
    }

    async downloadZipFileAndUnpack(url: string): Promise<string[]> {
        try {
            console.log(`Downloading zip file from URL: ${url}`);
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const zipFilePath = path.join(process.cwd(), 'tenderland.zip');
            
            console.log(`Writing zip file to: ${zipFilePath}`);
            // Write zip file
            await fs.promises.writeFile(zipFilePath, response.data);
            
            console.log('Unpacking zip file');
            // Unpack zip file
            const zip = new AdmZip(zipFilePath);
            const extractPath = path.join(process.cwd(), 'tenderland');
            
            // Create extract directory if it doesn't exist
            if (!fs.existsSync(extractPath)) {
                console.log(`Creating extract directory: ${extractPath}`);
                fs.mkdirSync(extractPath);
            }
            
            zip.extractAllTo(extractPath, true);
            
            // Get list of extracted files
            const extractedFiles = zip.getEntries().map(entry => path.join(extractPath, entry.entryName));
            console.log('Extracted files:', extractedFiles);
            
            // Clean up zip file
            console.log('Cleaning up zip file');
            fs.unlinkSync(zipFilePath);

            return extractedFiles;
        } catch (error) {
            console.error('Error in downloadZipFileAndUnpack:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                });
            }
            throw error;
        }
    }

    async cleanupExtractedFiles(filePaths: string[]): Promise<void> {
        const extractPath = path.join(process.cwd(), 'tenderland');
        
        // Remove all files
        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Remove the directory
        if (fs.existsSync(extractPath)) {
            fs.rmdirSync(extractPath);
        }
    }
}