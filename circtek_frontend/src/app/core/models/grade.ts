export interface Grade {
  id: number;
  name: string;
  color: string;
  tenant_id: number;
  tenant_name?: string;
  created_at: string | null;
}

export interface GradeCreateRequest {
  name: string;
  color: string;
}

export interface GradeUpdateRequest {
  name?: string;
  color?: string;
}