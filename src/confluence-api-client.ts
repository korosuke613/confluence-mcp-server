import type {
  ConfluenceConfig,
  ConfluencePage,
  ConfluenceSearchResult,
  ConfluenceSpace,
} from "./types.ts";

export class ConfluenceAPIClient {
  private v2ApiUrl: string;
  private v1ApiUrl: string;
  private pageAncestorsCache: Map<string, string[]> = new Map();

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
        `Space to which access is not permitted: ${spaceKey}. Allowed spaces: ${
          this.config.allowedSpaces?.join(", ")
        }`,
      );
    }
  }

  /**
   * ページの祖先を取得してアクセス許可をチェック
   * @param pageId チェック対象のページID
   * @param allowedPages 許可されたページIDのリスト
   * @returns アクセスが許可されているかどうか
   */
  private async isPageAccessAllowed(
    pageId: string,
    allowedPages?: string[],
  ): Promise<boolean> {
    if (!allowedPages || allowedPages.length === 0) {
      return true; // 制限が設定されていない場合はすべて許可
    }

    // 直接指定されたページIDがリストに含まれているかチェック
    if (allowedPages.includes(pageId)) {
      return true;
    }

    // キャッシュから祖先情報を取得
    let ancestorIds: string[] | undefined = this.pageAncestorsCache.get(pageId);

    if (!ancestorIds) {
      try {
        // ページの祖先を取得
        const response = await fetch(
          `${this.v2ApiUrl}/pages/${pageId}?expand=ancestors`,
          {
            headers: this.getAuthHeaders(),
          },
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch page ancestors: ${response.statusText}`,
          );
          return false;
        }

        const pageData = await response.json();
        const ancestors = pageData.ancestors || [];

        // 祖先のIDリストを抽出してキャッシュに保存
        const ancestorIdsFromApi: string[] = ancestors.map((
          ancestor: { id: string },
        ) => ancestor.id);
        ancestorIds = ancestorIdsFromApi;
        this.pageAncestorsCache.set(pageId, ancestorIdsFromApi);
      } catch (error) {
        console.error(`Error checking page access: ${error}`);
        return false;
      }
    }

    // キャッシュされた祖先の中に許可されたページIDが含まれているかチェック
    if (ancestorIds) {
      for (const ancestorId of ancestorIds) {
        if (allowedPages.includes(ancestorId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 読み取りアクセスを検証
   * @param pageId チェック対象のページID
   * @throws エラー: アクセスが許可されていないページの場合
   */
  async validatePageReadAccess(pageId: string): Promise<void> {
    const allowed = await this.isPageAccessAllowed(
      pageId,
      this.config.allowedReadParentPages,
    );
    if (!allowed) {
      throw new Error(
        `Read access is not permitted for this page: ${pageId}. Allowed pages: ${
          this.config.allowedReadParentPages?.join(", ") || "all"
        }`,
      );
    }
  }

  /**
   * 書き込みアクセスを検証
   * @param pageId チェック対象のページID（親ページIDまたは更新対象ページID）
   * @throws エラー: アクセスが許可されていないページの場合
   */
  async validatePageWriteAccess(pageId: string): Promise<void> {
    const allowed = await this.isPageAccessAllowed(
      pageId,
      this.config.allowedWriteParentPages,
    );
    if (!allowed) {
      throw new Error(
        `Write access is not permitted for this page: ${pageId}. Allowed pages: ${
          this.config.allowedWriteParentPages?.join(", ") || "all"
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
        "Read-only mode is enabled; write operations are not allowed.",
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
    if (
      this.config.allowedReadParentPages &&
      this.config.allowedReadParentPages.length > 0
    ) {
      const parentFilter = this.config.allowedReadParentPages.map((id) =>
        `ancestor=${id}`
      ).join(" OR ");
      cqlQuery = `(${parentFilter}) AND ${cqlQuery}`;
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
    // ページの読み取りアクセス権限をチェック
    await this.validatePageReadAccess(pageId);

    const endpoint = `/pages/${pageId}?body-format=storage`;
    const page = await this.makeRequest<ConfluencePage>(endpoint);

    // ページが取得できた後、そのページのスペースが許可されているかチェック
    if (page.space && !this.isSpaceAllowed(page.space.key)) {
      throw new Error(
        `Space to which access is not permitted: ${page.space.key}. Allowed spaces: ${
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
            `Since no parent page is specified, the home page of the space (ID: ${finalParentPageId}) is used as the parent page.`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to retrieve the home page of the space: ${message}. Creating the page at the root level.`,
        );
      }
    }

    // 親ページが決定した場合、書き込みアクセス権限をチェック
    if (finalParentPageId) {
      await this.validatePageWriteAccess(finalParentPageId);
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
    const result = await this.makeRequest<ConfluencePage>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }, true); // v1 APIを使用

    // ページ作成後、キャッシュをクリア（親子関係が変わる可能性があるため）
    this.clearPageAncestorsCache();

    return result;
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
    const result = await this.makeRequest<ConfluencePage>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }, true); // v1 APIを使用

    // ページ更新後、該当ページのキャッシュをクリア
    this.clearPageAncestorsCache(pageId);

    return result;
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

  /**
   * ページの祖先キャッシュをクリア
   * @param pageId 特定のページIDを指定してクリア（省略時は全キャッシュをクリア）
   */
  clearPageAncestorsCache(pageId?: string): void {
    if (pageId) {
      this.pageAncestorsCache.delete(pageId);
    } else {
      this.pageAncestorsCache.clear();
    }
  }
}
