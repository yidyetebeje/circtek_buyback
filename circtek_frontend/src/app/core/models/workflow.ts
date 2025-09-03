export type WorkflowRecord = {
  id: number;
  name: string;
  description: string | null;
  status: boolean | null;
  canvas_state: unknown;
  tenant_id: number;
  tenant_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkflowCreateInput = {
  name: string;
  description?: string | null;
  status?: boolean | null;
  canvas_state: unknown;
  tenant_id?: number;
};

export type WorkflowUpdateInput = {
  name?: string;
  description?: string | null;
  status?: boolean | null;
  canvas_state?: unknown;
  tenant_id?: number;
};

export type WorkflowListResponse = {
  data: WorkflowRecord[];
  meta?: { total?: number };
};


