export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  allowedSpaces?: string[]; // 許可されたスペースキーのリスト
  readOnly?: boolean; // read-onlyモード（書き込み操作を禁止）
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space: {
    id: number;
    key: string;
    name: string;
    type: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  version?: {
    number: number;
    when: string;
    by: {
      type: string;
      displayName: string;
      userKey: string;
    };
  };
  _links: {
    webui: string;
    edit: string;
    tinyui: string;
    self: string;
  };
}

export interface ConfluenceSpace {
  id: number;
  key: string;
  name: string;
  type: string;
  status: string;
  description: {
    plain: {
      value: string;
      representation: string;
    };
  };
  homepage: {
    id: string;
    type: string;
    status: string;
    title: string;
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSearchResult {
  results: Array<{
    id: string;
    type: string;
    status: string;
    title: string;
    space: {
      id: number;
      key: string;
      name: string;
      type: string;
    };
    excerpt: string;
    url: string;
    lastModified: string;
  }>;
  start: number;
  limit: number;
  size: number;
  totalSize: number;
}

export interface TaskPageData {
  taskDescription: string;
  objectives: string[];
  progress: string;
}

export interface ProgressUpdateData {
  progress: string;
  newFindings: string[];
  nextSteps: string[];
}

export interface CreatePageResult {
  success: boolean;
  pageId: string;
  url?: string;
}

export interface UpdatePageResult {
  success: boolean;
  pageId: string;
  version?: number;
}

export interface FindOrCreateResult {
  pageId: string;
  isNew: boolean;
}
