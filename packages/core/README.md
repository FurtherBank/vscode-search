# @cpu-search/core

一个 vscode 左侧搜索替换同款的代码搜索和替换引擎，是 vscode-search 项目的核心库。

## 特性

- 高性能的文本和正则表达式搜索
- 支持文件包含/排除模式
- 尊重 .gitignore 规则
- 提供上下文行显示
- 支持大小写敏感、全词匹配等选项
- 生成格式化的搜索报告
- 基于报告的修改应用功能
- 搜索历史管理

## 安装

```bash
npm install @cpu-search/core
# 或者
yarn add @cpu-search/core
# 或者
pnpm add @cpu-search/core
```

## 基本用法

```typescript
import { SearchEngine, FileSystem } from '@cpu-search/core';
import { SearchOptions } from '@cpu-search/core/types';

// 实现自定义文件系统适配器
class MyFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    // 实现文件读取
  }

  async writeFile(path: string, content: string): Promise<void> {
    // 实现文件写入
  }

  listFiles(patterns: string[]): Promise<string[]> {
    // 实现文件列表获取
  }

  watchFiles(callback: (path: string) => void): void {
    // 实现文件监控
  }
}

// 创建搜索引擎实例
const fs = new MyFileSystem();
const engine = new SearchEngine(fs);

// 执行搜索
const results = await engine.search('searchPattern', '/path/to/search', {
  caseSensitive: false,
  wholeWord: true,
  useRegex: false,
  include: ['*.ts', '*.tsx'],
  exclude: ['**/node_modules/**'],
  contextLines: { before: 2, after: 2 },
});

// 生成报告
const report = engine.generateReport(results, '/path/to/search');
console.log(report);

// 执行替换
await engine.replace(results, 'replaceText');

// 撤销替换
await engine.undoReplace();

// 应用修改后的报告
await engine.applyReportChange(modifiedReport, '/path/to/search');
```

## API

### SearchEngine

搜索引擎核心类，提供搜索、替换和报告生成功能。

#### 方法

- `search(searchPattern, rootPath, options, onProgress?)`: 执行搜索操作
- `cancelSearch()`: 中断当前搜索
- `replace(searchResults, replaceText)`: 执行替换操作
- `previewReplace(searchResults, replaceText)`: 预览替换结果
- `undoReplace()`: 撤销上一次替换操作
- `generateReport(results, rootPath)`: 生成搜索报告
- `applyReportChange(reportText, rootPath)`: 应用修改后的报告

### SearchHistory

搜索历史管理类，用于保存和检索搜索查询。

#### 方法

- `saveQuery(searchPattern, options)`: 保存搜索查询
- `getHistory()`: 获取搜索历史

### 搜索选项

搜索选项对象支持以下属性：

- `caseSensitive`: 是否区分大小写 (默认: false)
- `wholeWord`: 是否全词匹配 (默认: false)
- `useRegex`: 是否使用正则表达式 (默认: false)
- `include`: 包含的文件匹配模式 (例如: ['*.ts'])
- `exclude`: 排除的文件匹配模式 (例如: ['**/node_modules/**'])
- `contextLines`: 上下文行配置 (例如: { before: 2, after: 2 })
- `maxResults`: 最大结果数量
- `respectGitIgnore`: 是否尊重 .gitignore 规则 (默认: true)

## 许可证

ISC
