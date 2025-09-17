export interface OtaUpdate {
  id: number;
  version: string;
  url: string;
  target_os: 'window' | 'macos';
  target_architecture: 'x86' | 'arm';
  release_channel: 'stable' | 'beta' | 'dev';
  tenant_id: number;
  tenant_name?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OtaUpdateCreateRequest {
  version: string;
  url: string;
  target_os: 'window' | 'macos';
  target_architecture: 'x86' | 'arm';
  release_channel: 'stable' | 'beta' | 'dev';
}

export interface OtaUpdateUpdateRequest {
  version?: string;
  url?: string;
  target_os?: 'window' | 'macos';
  target_architecture?: 'x86' | 'arm';
  release_channel?: 'stable' | 'beta' | 'dev';
}

export type OtaUpdateListResponse = {
  data: OtaUpdate[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
  message: string;
  status: number;
};