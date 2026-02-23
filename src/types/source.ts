export interface Source {
  _id: string;
  name: string;
  maskId: string;
  type: string;
  provider: string;
  apiKey: string;
  owner: string;
  eventCount: number;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourcesResponse {
  total: number;
  pages: number;
  page: number;
  limit: number;
  data: Source[];
}
