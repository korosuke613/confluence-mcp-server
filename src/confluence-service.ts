import type {
  ConfluenceConfig,
  ConfluencePage,
  ConfluenceSearchResult,
  ConfluenceSpace,
  FindOrCreateResult,
} from "./types.ts";
import { ConfluenceAPIClient } from "./confluence-api-client.ts";
import { TaskContentGenerator } from "./task-content-generator.ts";

export class ConfluenceService {
  private apiClient: ConfluenceAPIClient;

  constructor(config: ConfluenceConfig) {
    this.apiClient = new ConfluenceAPIClient(config);
  }

  // 基本的なAPI操作の委譲
  async search(
    query: string,
    limit: number = 10,
  ): Promise<ConfluenceSearchResult> {
    return await this.apiClient.search(query, limit);
  }

  async getPage(
    pageId: string,
    expand: string = "body.storage,version",
  ): Promise<ConfluencePage> {
    return await this.apiClient.getPage(pageId, expand);
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    return await this.apiClient.getSpace(spaceKey);
  }

  async listPages(
    spaceKey: string,
    limit: number = 25,
  ): Promise<
    { results: ConfluencePage[]; size: number; start: number; limit: number }
  > {
    return await this.apiClient.listPages(spaceKey, limit);
  }

  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentPageId?: string,
  ): Promise<ConfluencePage> {
    return await this.apiClient.createPage(
      spaceKey,
      title,
      content,
      parentPageId,
    );
  }

  async updatePage(
    pageId: string,
    title: string,
    content: string,
    versionNumber?: number,
  ): Promise<ConfluencePage> {
    return await this.apiClient.updatePage(
      pageId,
      title,
      content,
      versionNumber,
    );
  }

  async getPageContent(pageId: string): Promise<string> {
    const page = await this.getPage(pageId, "body.storage");
    return page.body?.storage?.value || "";
  }

  async searchBySpace(
    spaceKey: string,
    query: string,
    limit: number = 10,
  ): Promise<ConfluenceSearchResult> {
    return await this.apiClient.searchBySpace(spaceKey, query, limit);
  }

  // 高レベル業務ロジック
  async findOrCreateParentPage(
    spaceKey: string,
    parentTitle: string,
    parentContent?: string,
  ): Promise<string> {
    this.apiClient.validateWriteOperation();
    this.apiClient.validateSpaceAccess(spaceKey);

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
  ): Promise<FindOrCreateResult> {
    this.apiClient.validateWriteOperation();
    this.apiClient.validateSpaceAccess(spaceKey);

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
    const content = TaskContentGenerator.generateTaskPageContent({
      taskDescription,
      objectives,
      progress: "進行中",
    });

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
}
