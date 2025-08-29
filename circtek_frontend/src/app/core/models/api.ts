export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
