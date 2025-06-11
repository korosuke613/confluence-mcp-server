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

export class ConfluenceClient {
  public config: ConfluenceConfig;
  private baseApiUrl: string;
  private v1ApiUrl: string;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    this.baseApiUrl = `${config.baseUrl.replace(/\/$/, "")}/wiki/api/v2`;
    this.v1ApiUrl = `${config.baseUrl.replace(/\/$/, "")}/wiki/rest/api`;
  }

  getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.config.email}:${this.config.apiToken}`);
    return {
      "Authorization": `Basic ${credentials}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
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
      throw new Error(
        `アクセスが許可されていないスペースです: ${spaceKey}. 許可されたスペース: ${
          this.config.allowedSpaces?.join(", ")
        }`,
      );
    }
  }

  private validateWriteOperation(): void {
    if (this.config.readOnly) {
      throw new Error(
        "read-onlyモードが有効になっています。書き込み操作は実行できません。",
      );
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useV1 = false,
  ): Promise<T> {
    const baseUrl = useV1 ? this.v1ApiUrl : this.baseApiUrl;
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    console.error(`Making request to: ${url}`);
    console.error(`Base URL: ${this.config.baseUrl}`);
    console.error(`Email: ${this.config.email}`);
    console.error(
      `API Token length: ${
        this.config.apiToken ? this.config.apiToken.length : "undefined"
      }`,
    );

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Response status: ${response.status}`);
      console.error(`Response headers:`, response.headers);
      throw new Error(
        `Confluence API error (${response.status}): ${errorText}`,
      );
    }

    return response.json();
  }

  async search(
    query: string,
    limit: number = 10,
  ): Promise<ConfluenceSearchResult> {
    const encodedQuery = encodeURIComponent(query);

    // スペース制限がある場合はCQLクエリに追加
    let cqlQuery = `text~"${encodedQuery}"`;
    if (this.config.allowedSpaces && this.config.allowedSpaces.length > 0) {
      const spaceFilter = this.config.allowedSpaces.map((key) =>
        `space="${key}"`
      ).join(" OR ");
      cqlQuery = `(${spaceFilter}) AND ${cqlQuery}`;
    }

    const endpoint = `/content/search?cql=${
      encodeURIComponent(cqlQuery)
    }&limit=${limit}&expand=space`;
    return await this.makeRequest<ConfluenceSearchResult>(endpoint, {}, true);
  }

  async getPage(
    pageId: string,
    _expand: string = "body.storage,version",
  ): Promise<ConfluencePage> {
    const endpoint = `/pages/${pageId}?body-format=storage`;
    const page = await this.makeRequest<ConfluencePage>(endpoint);

    // ページが取得できた後、そのページのスペースが許可されているかチェック
    if (page.space && !this.isSpaceAllowed(page.space.key)) {
      throw new Error(
        `アクセスが許可されていないスペースのページです: ${page.space.key}. 許可されたスペース: ${
          this.config.allowedSpaces?.join(", ")
        }`,
      );
    }

    return page;
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    this.validateSpaceAccess(spaceKey);

    const endpoint = `/spaces?keys=${spaceKey}`;
    const response = await this.makeRequest<{ results: ConfluenceSpace[] }>(
      endpoint,
    );
    if (response.results && response.results.length > 0) {
      return response.results[0];
    }
    throw new Error(`Space with key ${spaceKey} not found`);
  }

  async listPages(
    spaceKey: string,
    limit: number = 25,
  ): Promise<
    { results: ConfluencePage[]; size: number; start: number; limit: number }
  > {
    this.validateSpaceAccess(spaceKey);

    const endpoint = `/pages?space-key=${spaceKey}&limit=${limit}`;
    return await this.makeRequest<
      { results: ConfluencePage[]; size: number; start: number; limit: number }
    >(endpoint);
  }

  async getPageContent(pageId: string): Promise<string> {
    const page = await this.getPage(pageId, "body.storage");
    return page.body?.storage?.value || "";
  }

  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentPageId?: string,
  ): Promise<ConfluencePage> {
    this.validateWriteOperation();
    this.validateSpaceAccess(spaceKey);

    // 親ページが指定されていない場合、スペースのホームページを取得して親ページとして使用
    let finalParentPageId = parentPageId;
    if (!finalParentPageId) {
      try {
        const space = await this.getSpace(spaceKey);
        if (space.homepage && space.homepage.id) {
          finalParentPageId = space.homepage.id;
          console.error(
            `親ページが指定されていないため、スペースのホームページ (ID: ${finalParentPageId}) を親ページとして使用します`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `スペースのホームページ取得に失敗しました: ${message}. ルート直下にページを作成します`,
        );
      }
    }

    const body = {
      type: "page",
      title: title,
      space: {
        key: spaceKey,
      },
      body: {
        storage: {
          value: content,
          representation: "storage",
        },
      },
      ...(finalParentPageId && {
        ancestors: [{ id: finalParentPageId }],
      }),
    };

    const endpoint = "/content";
    return await this.makeRequest<ConfluencePage>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }, true); // v1 APIを使用
  }

  async updatePage(
    pageId: string,
    title: string,
    content: string,
    versionNumber?: number,
  ): Promise<ConfluencePage> {
    this.validateWriteOperation();
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
          representation: "storage",
        },
      },
      version: {
        number: versionNumber || 1,
      },
    };

    const endpoint = `/content/${pageId}`;
    return await this.makeRequest<ConfluencePage>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }, true); // v1 APIを使用
  }

  async searchBySpace(
    spaceKey: string,
    query: string,
    limit: number = 10,
  ): Promise<ConfluenceSearchResult> {
    this.validateSpaceAccess(spaceKey);

    const encodedQuery = encodeURIComponent(query);
    const endpoint =
      `/content/search?cql=space="${spaceKey}" AND text~"${encodedQuery}"&limit=${limit}&expand=space`;
    return await this.makeRequest<ConfluenceSearchResult>(endpoint, {}, true);
  }

  async findOrCreateParentPage(
    spaceKey: string,
    parentTitle: string,
    parentContent?: string,
  ): Promise<string> {
    this.validateWriteOperation();
    this.validateSpaceAccess(spaceKey);

    // まず、指定されたタイトルのページが存在するかを検索
    const searchResults = await this.searchBySpace(spaceKey, parentTitle, 10);

    // 完全一致のページを探す
    const exactMatch = searchResults.results.find((page) =>
      page.title.toLowerCase() === parentTitle.toLowerCase() &&
      page.space.key === spaceKey
    );

    if (exactMatch) {
      console.error(
        `既存の親ページが見つかりました: "${parentTitle}" (ID: ${exactMatch.id})`,
      );
      return exactMatch.id;
    }

    // 見つからない場合は新しく作成
    const defaultContent = parentContent ||
      `<h1>${parentTitle}</h1><p>このページは自動生成された親ページです。</p>`;
    const newPage = await this.createPage(
      spaceKey,
      parentTitle,
      defaultContent,
    );
    console.error(
      `新しい親ページを作成しました: "${parentTitle}" (ID: ${newPage.id})`,
    );

    return newPage.id;
  }

  async findOrCreateTodaysProgressPage(
    spaceKey: string,
    progressParentId: string,
  ): Promise<{ pageId: string; isNew: boolean }> {
    this.validateWriteOperation();
    this.validateSpaceAccess(spaceKey);

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${
      today.getMonth() + 1
    }月${today.getDate()}日`;
    const pageTitle = `Confluence MCP Server 開発状況 - ${dateStr}`;

    // 今日の進捗ページを検索
    const searchResults = await this.searchBySpace(spaceKey, pageTitle, 5);
    const exactMatch = searchResults.results.find((page) =>
      page.title === pageTitle && page.space.key === spaceKey
    );

    if (exactMatch) {
      console.error(
        `本日の進捗ページが見つかりました: "${pageTitle}" (ID: ${exactMatch.id})`,
      );
      return { pageId: exactMatch.id, isNew: false };
    }

    // 見つからない場合は新しく作成
    const taskDescription = "Confluence MCP Serverの開発進捗と実装状況の記録";
    const objectives = [
      "開発タスクの完了",
      "コード品質の向上",
      "機能の追加・改善",
    ];
    const content = this.generateTaskPageContent(
      taskDescription,
      objectives,
      "進行中",
    );

    const newPage = await this.createPage(
      spaceKey,
      pageTitle,
      content,
      progressParentId,
    );
    console.error(
      `新しい進捗ページを作成しました: "${pageTitle}" (ID: ${newPage.id})`,
    );

    return { pageId: newPage.id, isNew: true };
  }

  private generateTaskPageContent(
    taskDescription: string,
    objectives: string[],
    progress: string,
  ): string {
    const currentDate = new Date().toLocaleString("ja-JP");

    return `<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>作成日時:</strong> ${currentDate}</p>
    <p><strong>ステータス:</strong> ${progress}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>タスク概要</h2>
<p>${taskDescription}</p>

<h2>目標・目的</h2>
<ul>
${objectives.map((obj) => `  <li>${obj}</li>`).join("\n")}
</ul>

<h2>進捗状況</h2>
<p><strong>現在のステータス:</strong> ${progress}</p>

<h2>実施内容・発見事項</h2>
<ul>
  <li>（ここに実施内容や発見事項を追記していきます）</li>
</ul>

<h2>次のアクション</h2>
<ul>
  <li>（ここに次のステップを記載していきます）</li>
</ul>

<h2>意思決定ログ</h2>
<table>
  <tbody>
    <tr>
      <th>日時</th>
      <th>決定事項</th>
      <th>理由</th>
    </tr>
    <tr>
      <td>${currentDate}</td>
      <td>タスク開始</td>
      <td>-</td>
    </tr>
  </tbody>
</table>`;
  }
}
