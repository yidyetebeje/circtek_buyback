import { pagination } from "./pagination";

// define generic response type
export type response<T> = {
    data: T;
    message: string;
    status: number;
    error?: string;
    meta?: (pagination & { total: number; repair_id?: number; total_items?: number; total_quantity?: number });
}