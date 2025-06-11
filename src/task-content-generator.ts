import type { ProgressUpdateData, TaskPageData } from "./types.ts";

export class TaskContentGenerator {
  /**
   * タスクページの初期コンテンツを生成
   */
  static generateTaskPageContent(data: TaskPageData): string {
    const currentDate = new Date().toLocaleString("ja-JP");

    return `<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>作成日時:</strong> ${currentDate}</p>
    <p><strong>ステータス:</strong> ${data.progress}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>タスク概要</h2>
<p>${data.taskDescription}</p>

<h2>目標・目的</h2>
<ul>
${data.objectives.map((obj) => `  <li>${obj}</li>`).join("\n")}
</ul>

<h2>進捗状況</h2>
<p><strong>現在のステータス:</strong> ${data.progress}</p>

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

  /**
   * 既存のタスクページコンテンツを更新
   */
  static updateTaskPageContent(
    existingContent: string,
    updateData: ProgressUpdateData,
  ): string {
    const currentDate = new Date().toLocaleString("ja-JP");
    let updatedContent = existingContent;

    // ステータス更新
    updatedContent = updatedContent.replace(
      /<p><strong>ステータス:<\/strong>[^<]*<\/p>/,
      `<p><strong>ステータス:</strong> ${updateData.progress}</p>`,
    );

    // 新しい発見事項を追加
    if (updateData.newFindings.length > 0) {
      const findingsHtml = updateData.newFindings.map((finding) =>
        `  <li>${finding} (${currentDate})</li>`
      ).join("\n");
      updatedContent = updatedContent.replace(
        /<h2>実施内容・発見事項<\/h2>\s*<ul>/,
        `<h2>実施内容・発見事項</h2>\n<ul>\n${findingsHtml}`,
      );
    }

    // 次のステップを更新
    if (updateData.nextSteps.length > 0) {
      const nextStepsHtml = updateData.nextSteps.map((step) =>
        `  <li>${step}</li>`
      ).join("\n");
      updatedContent = updatedContent.replace(
        /<h2>次のアクション<\/h2>\s*<ul>[\s\S]*?<\/ul>/,
        `<h2>次のアクション</h2>\n<ul>\n${nextStepsHtml}\n</ul>`,
      );
    }

    // 意思決定ログにエントリ追加
    const newLogEntry = `    <tr>
      <td>${currentDate}</td>
      <td>進捗更新: ${updateData.progress}</td>
      <td>${
      updateData.newFindings.length > 0
        ? "新しい発見事項を追加"
        : "進捗状況の更新"
    }</td>
    </tr>`;

    updatedContent = updatedContent.replace(
      /<\/tbody>\s*<\/table>/,
      `${newLogEntry}\n  </tbody>\n</table>`,
    );

    return updatedContent;
  }
}
