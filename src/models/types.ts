export interface Job {
    id?: number;
    jobId: string;
    title: string;
    company: string;
    location: string;
    description: string;
    postedDate: Date;
    jobUrl: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface JobFilters {
    page?: number;
    limit?: number;
    company?: string;
    location?: string;
    fromDate?: Date;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
} 