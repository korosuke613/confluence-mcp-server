export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  allowedSpaces?: string[]; // 許可されたスペースキーのリスト
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

export class ConfluenceClient {
  public config: ConfluenceConfig;
  private baseApiUrl: string;
  private v1ApiUrl: string;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    this.baseApiUrl = `${config.baseUrl.replace(/\/$/, '')}/wiki/api/v2`;
    this.v1ApiUrl = `${config.baseUrl.replace(/\/$/, '')}/wiki/rest/api`;
  }

  getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.config.email}:${this.config.apiToken}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private isSpaceAllowed(spaceKey: string): boolean {
    if (!this.config.allowedSpaces || this.config.allowedSpaces.length === 0) {
      return true; // 制限が設定されていない場合はすべて許可
    }
    return this.config.allowedSpaces.includes(spaceKey);
  }

  private validateSpaceAccess(spaceKey: string): void {
    if (!this.isSpaceAllowed(spaceKey)) {
      throw new Error(`アクセスが許可されていないスペースです: ${spaceKey}. 許可されたスペース: ${this.config.allowedSpaces?.join(', ')}`);
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, useV1 = false): Promise<T> {
    const baseUrl = useV1 ? this.v1ApiUrl : this.baseApiUrl;
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    console.error(`Making request to: ${url}`);
    console.error(`Base URL: ${this.config.baseUrl}`);
    console.error(`Email: ${this.config.email}`);
    console.error(`API Token length: ${this.config.apiToken ? this.config.apiToken.length : 'undefined'}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Response status: ${response.status}`);
      console.error(`Response headers:`, response.headers);
      throw new Error(`Confluence API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async search(query: string, limit: number = 10): Promise<ConfluenceSearchResult> {
    const encodedQuery = encodeURIComponent(query);
    
    // スペース制限がある場合はCQLクエリに追加
    let cqlQuery = `text~"${encodedQuery}"`;
    if (this.config.allowedSpaces && this.config.allowedSpaces.length > 0) {
      const spaceFilter = this.config.allowedSpaces.map(key => `space="${key}"`).join(' OR ');
      cqlQuery = `(${spaceFilter}) AND ${cqlQuery}`;
    }
    
    const endpoint = `/content/search?cql=${encodeURIComponent(cqlQuery)}&limit=${limit}&expand=space`;
    return await this.makeRequest<ConfluenceSearchResult>(endpoint, {}, true);
  }

  async getPage(pageId: string, _expand: string = "body.storage,version"): Promise<ConfluencePage> {
    const endpoint = `/pages/${pageId}?body-format=storage`;
    const page = await this.makeRequest<ConfluencePage>(endpoint);
    
    // ページが取得できた後、そのページのスペースが許可されているかチェック
    if (page.space && !this.isSpaceAllowed(page.space.key)) {
      throw new Error(`アクセスが許可されていないスペースのページです: ${page.space.key}. 許可されたスペース: ${this.config.allowedSpaces?.join(', ')}`);
    }
    
    return page;
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    this.validateSpaceAccess(spaceKey);
    
    const endpoint = `/spaces?keys=${spaceKey}`;
    const response = await this.makeRequest<{results: ConfluenceSpace[]}>(endpoint);
    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`Space with key ${spaceKey} not found`);
  }

  async listPages(spaceKey: string, limit: number = 25): Promise<{ results: ConfluencePage[]; size: number; start: number; limit: number }> {
    this.validateSpaceAccess(spaceKey);
    
    const endpoint = `/pages?space-key=${spaceKey}&limit=${limit}`;
    return await this.makeRequest<{ results: ConfluencePage[]; size: number; start: number; limit: number }>(endpoint);
  }

  async getPageContent(pageId: string): Promise<string> {
    const page = await this.getPage(pageId, "body.storage");
    return page.body?.storage?.value || "";
  }

  async createPage(spaceKey: string, title: string, content: string, parentPageId?: string): Promise<ConfluencePage> {
    this.validateSpaceAccess(spaceKey);
    
    const body = {
      type: "page",
      title: title,
      space: {
        key: spaceKey
      },
      body: {
        storage: {
          value: content,
          representation: "storage"
        }
      },
      ...(parentPageId && {
        ancestors: [{ id: parentPageId }]
      })
    };

    const endpoint = "/content";
    return await this.makeRequest<ConfluencePage>(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    }, true); // v1 APIを使用
  }

  async updatePage(pageId: string, title: string, content: string, versionNumber?: number): Promise<ConfluencePage> {
    // 既存ページの情報を取得してスペースチェック
    const existingPage = await this.getPage(pageId, "version");
    
    if (!versionNumber && existingPage.version) {
      versionNumber = existingPage.version.number + 1;
    }

    const body = {
      type: "page",
      title: title,
      body: {
        storage: {
          value: content,
          representation: "storage"
        }
      },
      version: {
        number: versionNumber || 1
      }
    };

    const endpoint = `/content/${pageId}`;
    return await this.makeRequest<ConfluencePage>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body)
    }, true); // v1 APIを使用
  }

  async searchBySpace(spaceKey: string, query: string, limit: number = 10): Promise<ConfluenceSearchResult> {
    this.validateSpaceAccess(spaceKey);
    
    const encodedQuery = encodeURIComponent(query);
    const endpoint = `/content/search?cql=space="${spaceKey}" AND text~"${encodedQuery}"&limit=${limit}&expand=space`;
    return await this.makeRequest<ConfluenceSearchResult>(endpoint, {}, true);
  }
}