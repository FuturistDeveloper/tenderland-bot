import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import { ENV } from "..";
import { CreateTaskResponse, CreateTaskResponseSchema, TendersResponse, TendersResponseSchema } from '../schemas/tenderland.schema';
import { handleApiError } from '../utils/error-handler';

class TenderlandService {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly axiosInstance: AxiosInstance;

    public readonly batchSize = 100;
    public readonly limit = 1000;

    constructor() {
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

    async createTaskForGettingTenders(autosearchId: number, orderBy: string = 'desc'): Promise<CreateTaskResponse | undefined> {
        try {
            const response = await this.axiosInstance.get(`/Export/Create?autosearchId=${autosearchId}&limit=${this.limit}&batchSize=${this.batchSize}&orderBy=${orderBy}&format=json`);
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

    async downloadZipFile(url: string): Promise<void> {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const zipFilePath = path.join(process.cwd(), 'tenderland.zip');
        fs.writeFile(zipFilePath, response.data, (err) => {
            if (err) {
                console.error('downloadZipFile', err);
            }
        });
    }   
}