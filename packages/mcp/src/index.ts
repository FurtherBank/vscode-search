import { promises as fsPromises } from 'fs';
import { SearchEngine, FileSystem } from '@cpu-search/core';
import { SearchOptions } from '@cpu-search/core/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return fsPromises.readFile(path, 'utf8');
  }
  async writeFile(path: string, content: string): Promise<void> {
    await fsPromises.writeFile(path, content, 'utf8');
  }
  listFiles(patterns: string[]): Promise<string[]> {
    return Promise.reject(new Error('listFiles not implemented'));
  }
  watchFiles(callback: (path: string) => void): void {
    throw new Error('watchFiles not implemented');
  }
}

/**
 * 生成搜索报告
 */
export async function generateReport(params: {
  rootPath: string;
  searchPattern: string;
  options: SearchOptions;
}): Promise<string> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(params.searchPattern, params.rootPath, params.options);
  return engine.generateReport(results, params.rootPath);
}

/**
 * 搜索并替换
 */
export async function searchAndReplace(params: {
  searchPattern: string;
  replaceText: string;
  rootPath: string;
  options: SearchOptions;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(params.searchPattern, params.rootPath, params.options);
  await engine.replace(results, params.replaceText);
}

/**
 * 应用报告修改到文件
 */
export async function applyReportChange(params: {
  rootPath: string;
  reportText: string;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  await engine.applyReportChange(params.reportText, params.rootPath);
}

// MCP server setup

const server = new McpServer({
  name: 'cpu-search-mcp',
  version: '1.0.0',
  // 默认提示，引导模型使用重构工具并提供参数示例和技巧
  defaultPrompt: `
以下是使用cpu-search-mcp重构工具进行代码重构的指南和示例：
1. 使用 generateReport({rootPath, searchPattern, options }) 工具生成代码修改报告并预览更改；
2. 可以直接修改上述报告的内容，然后使用 applyReportChange({rootPath, reportText }) 工具传入修改后的报告内容，即可在文件系统应用对应修改；
3. 也可以使用 searchAndReplace({rootPath, searchPattern, replaceText, options }) 工具直接执行替换操作，实现重构；

示例：重构 TypeScript 源代码时，options 参数设置如下以限定文件范围：
{
  include: ['*.ts', '*.tsx'],
  exclude: ['*.test.ts', '*.test.tsx']
}
这样可以避免修改测试文件和其他无关文件。

快速重构技巧：
- 先运行 generateReport 预览修改范围，再运行 searchAndReplace；
- 分步执行替换，确保每次变动都符合预期；
- 可结合正则表达式和全字匹配优化搜索；
- 如果需要回滚，可再运行 applyReportChange 恢复原始状态。
`,
  capabilities: {
    resources: {},
    tools: {},
  },
});

// register generateReport tool
server.tool(
  'generateReport',
  {
    searchPattern: z.string().describe('Search pattern'),
    rootPath: z.string().describe('Root path to search'),
    options: z.any().optional().describe('Search options'),
  },
  async (
    {
      searchPattern,
      rootPath,
      options = {},
    }: { searchPattern: string; rootPath: string; options?: SearchOptions },
    _extra
  ) => {
    const report = await generateReport({ searchPattern, rootPath, options });
    return { content: [{ type: 'text', text: report }] };
  }
);
server.tool(
  'searchAndReplace',
  {
    searchPattern: z.string(),
    replaceText: z.string(),
    rootPath: z.string(),
    options: z.any().optional(),
  },
  async (
    {
      searchPattern,
      replaceText,
      rootPath,
      options = {},
    }: { searchPattern: string; replaceText: string; rootPath: string; options?: SearchOptions },
    _extra
  ) => {
    await searchAndReplace({ searchPattern, replaceText, rootPath, options });
    return { content: [{ type: 'text', text: 'Replace completed' }] };
  }
);
server.tool(
  'applyReportChange',
  {
    reportText: z.string().describe('Report content'),
    rootPath: z.string().describe('Root path to apply changes'),
  },
  async ({ reportText, rootPath }: { reportText: string; rootPath: string }, _extra) => {
    await applyReportChange({ reportText, rootPath });
    return { content: [{ type: 'text', text: 'Applied report changes' }] };
  }
);

// run the MCP server over stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CPU Search MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal MCP server error:', error);
  process.exit(1);
});
