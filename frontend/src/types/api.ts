export interface ApiMeta {
  page: number;
  size: number;
  total: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
  code: string;
}
