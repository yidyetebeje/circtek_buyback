export type LabelTemplateRecord = {
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

export type LabelTemplateCreateInput = {
  name: string;
  description?: string | null;
  status?: boolean | null;
  canvas_state: unknown;
  tenant_id?: number;
};

export type LabelTemplateUpdateInput = {
  name?: string;
  description?: string | null;
  status?: boolean | null;
  canvas_state?: unknown;
  tenant_id?: number;
};

export type LabelTemplateListResponse = {
  data: LabelTemplateRecord[];
  meta?: { total?: number };
};


