#!/usr/bin/env node
import { promises as fsPromises } from 'fs';
import { SearchEngine, FileSystem } from '@cpu-search/core';
import { SearchOptions } from '@cpu-search/core/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { rootPath?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      options.rootPath = args[i + 1];
      i++; // 跳过下一个参数，因为它是rootPath的值
    }
  }

  return options;
}

// 获取命令行参数
const cliOptions = parseArgs();
// 默认工作目录，如果命令行没有提供则使用当前目录
const DEFAULT_ROOT_PATH = process.cwd();

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
export async function generateSearchReport(params: {
  searchPattern: string;
  options: SearchOptions;
}): Promise<string> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(
    params.searchPattern,
    cliOptions.rootPath || DEFAULT_ROOT_PATH,
    params.options
  );
  return engine.generateReport(results, cliOptions.rootPath || DEFAULT_ROOT_PATH);
}

/**
 * 搜索并替换
 */
export async function searchAndReplace(params: {
  searchPattern: string;
  replaceText: string;
  options: SearchOptions;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(
    params.searchPattern,
    cliOptions.rootPath || DEFAULT_ROOT_PATH,
    params.options
  );
  await engine.replace(results, params.replaceText);
}

/**
 * 应用报告修改到文件
 */
export async function applyReportChange(params: { reportText: string }): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  await engine.applyReportChange(params.reportText, cliOptions.rootPath || DEFAULT_ROOT_PATH);
}

// MCP server setup

const server = new McpServer({
  name: 'cpu-search-mcp',
  version: '1.0.0',
  // 默认提示，引导模型使用重构工具并提供参数示例和技巧
  defaultPrompt: `
cpu-search-mcp工具是一个复刻vscode左侧搜索替换的代码重构工具，以下是使用工具进行代码重构的指南和示例：
1. 使用 generateSearchReport({searchPattern, options }) 工具生成代码搜索报告进行预览；
其中 options 包括：
- caseSensitive: 是否区分大小写（默认为 false）
- wholeWord: 是否全字匹配（默认为 false）
- useRegex: 是否使用正则表达式替换（默认为 false）
- include: 包含的文件类型（如 ['*.ts', '*.tsx']）
- exclude: 排除的文件类型（如 ['*.test.ts', '*.test.tsx']）
- contextLines: 搜索结果报告附带的上下文行数（如 { before: 1, after: 1 }）
2. 可以直接修改上述报告的内容，然后传入到 applyReportChange({ reportText: "generateSearchReport 报告修改后的内容" }) 工具，即可diff修改内容，并在文件系统应用对应修改；
3. 也可以使用 searchAndReplace({searchPattern, replaceText, options }) 工具直接执行搜索替换操作，实现重构；

示例：重构 TypeScript 源代码，将 urlString 参数名改为 url，搜索 options 参数设置如下：
{
  wholeWord: true,
  caseSensitive: true,
  include: ['*.ts', '*.tsx'],
  exclude: ['*.test.ts', '*.test.tsx']
}
这样可以避免修改测试文件和其他无关文件和内容。

快速重构技巧：
- 重构时注意想好需要传入的参数(尤其使用正则表达式时)，确保搜索范围和替换内容准确；
- 先运行 generateSearchReport 预览修改范围，确认无误再运行 searchAndReplace 执行替换；
- [重要]如果要对搜索关键词附近的代码进行不固定的修改，可以直接编辑 generateSearchReport 生成的报告，然后通过 applyReportChange 应用修改；
此时注意 contextLines 指定需要的上下文行数，以便在报告中看到足够的代码上下文并进行修改；
- 分步执行替换，确保每次变动都符合预期；
- 可结合正则表达式和全字匹配进行复杂搜索；
`,
  capabilities: {
    resources: {},
    tools: {},
  },
});

// register generateSearchReport tool
server.tool(
  'generateSearchReport',
  {
    searchPattern: z.string().describe('Search pattern'),
    options: z.any().optional().describe('Search options'),
  },
  async (
    { searchPattern, options = {} }: { searchPattern: string; options?: SearchOptions },
    _extra
  ) => {
    const report = await generateSearchReport({
      searchPattern,
      options,
    });
    return { content: [{ type: 'text', text: report }] };
  }
);
server.tool(
  'searchAndReplace',
  {
    searchPattern: z.string(),
    replaceText: z.string(),
    options: z.any().optional(),
  },
  async (
    {
      searchPattern,
      replaceText,
      options = {},
    }: { searchPattern: string; replaceText: string; options?: SearchOptions },
    _extra
  ) => {
    await searchAndReplace({
      searchPattern,
      replaceText,
      options,
    });
    return { content: [{ type: 'text', text: 'Replace completed' }] };
  }
);
server.tool(
  'applyReportChange',
  {
    reportText: z.string().describe('Report content'),
  },
  async ({ reportText }: { reportText: string; rootPath?: string }, _extra) => {
    await applyReportChange({ reportText });
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
