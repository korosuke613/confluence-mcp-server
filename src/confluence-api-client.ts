import type {
  ConfluenceConfig,
  ConfluencePage,
  ConfluenceSearchResult,
  ConfluenceSpace,
} from "./types.ts";

export class ConfluenceAPIClient {
  private v2ApiUrl: string;
  private v1ApiUrl: string;

  constructor(public config: ConfluenceConfig) {
    this.v2ApiUrl = `${config.baseUrl.replace(/\/$/, "")}/wiki/api/v2`;
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

  /*
   *  スペースアクセスを検証
   *  @throws エラー: アクセスが許可されていないスペースの場合
   */
  validateSpaceAccess(spaceKey: string): void {
    if (!this.isSpaceAllowed(spaceKey)) {
      throw new Error(
        `アクセスが許可されていないスペースです: ${spaceKey}. 許可されたスペース: ${
          this.config.allowedSpaces?.join(", ")
        }`,
      );
    }
  }

  /*
   * 書き込み操作を検証
   * @throws エラー: read-onlyモードが有効な場合
   */
  validateWriteOperation(): void {
    if (this.config.readOnly) {
      throw new Error(
        "read-onlyモードが有効になっています。書き込み操作は実行できません。",
      );
    }
  }

  /*
   * APIリクエストを実行
   * @param endpoint APIエンドポイント
   * @param options リクエストオプション
   * @param useV1 v1 APIを使用するかどうか
   * @returns レスポンスデータ
   * @throws エラー: レスポンスが失敗した場合
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useV1 = false,
  ): Promise<T> {
    const baseUrl = useV1 ? this.v1ApiUrl : this.v2ApiUrl;
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

  // doc: https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content/#api-wiki-rest-api-content-search-get
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

  // doc: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-get
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

  // doc: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-get
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

  // doc: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-get
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

  // doc: https://developer.atlassian.com/server/confluence/rest/v1000/api-group-content-resource/#api-rest-api-content-post
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

  // doc: https://developer.atlassian.com/server/confluence/rest/v1000/api-group-content-resource/#api-rest-api-content-contentid-put
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

  // doc: https://developer.atlassian.com/server/confluence/rest/v1000/api-group-search/#api-rest-api-search-get
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
}
