import { promises as fsPromises } from 'fs';
import { SearchEngine, FileSystem, } from '@cpu-search/core';
import { SearchOptions, ReplaceOptions } from '@cpu-search/core/types';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
  searchPattern: string;
  rootPath: string;
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
  replaceOptions: ReplaceOptions;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(params.searchPattern, params.rootPath, params.options);
  await engine.replace(results, params.replaceText, params.replaceOptions);
}

/**
 * 应用报告修改到文件
 */
export async function applyReportChange(params: {
  reportText: string;
  rootPath: string;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  await engine.applyReportChange(params.reportText, params.rootPath);
}

// MCP server setup

const server = new McpServer({
  name: "cpu-search-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// register generateReport tool
server.tool(
  "generateReport",
  {
    searchPattern: z.string().describe("Search pattern"),
    rootPath: z.string().describe("Root path to search"),
    options: z.any().optional().describe("Search options"),
  },
  async (
    { searchPattern, rootPath, options = {} }: { searchPattern: string; rootPath: string; options?: SearchOptions },
    _extra
  ) => {
    const report = await generateReport({ searchPattern, rootPath, options });
    return { content: [{ type: "text", text: report }] };
  }
);
server.tool(
  "searchAndReplace",
  {
    searchPattern: z.string(),
    replaceText: z.string(),
    rootPath: z.string(),
    options: z.any().optional(),
    replaceOptions: z.any().optional(),
  },
  async (
    { searchPattern, replaceText, rootPath, options = {}, replaceOptions = {} }: { searchPattern: string; replaceText: string; rootPath: string; options?: SearchOptions; replaceOptions?: ReplaceOptions },
    _extra
  ) => {
    await searchAndReplace({ searchPattern, replaceText, rootPath, options, replaceOptions });
    return { content: [{ type: "text", text: "Replace completed" }] };
  }
);
server.tool(
  "applyReportChange",
  {
    reportText: z.string().describe("Report content"),
    rootPath: z.string().describe("Root path to apply changes"),
  },
  async (
    { reportText, rootPath }: { reportText: string; rootPath: string },
    _extra
  ) => {
    await applyReportChange({ reportText, rootPath });
    return { content: [{ type: "text", text: "Applied report changes" }] };
  }
);
    await applyReportChange({ reportText, rootPath });
    return { content: [{ type: "text", text: "Applied report changes" }] };
  }
);

// run the MCP server over stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CPU Search MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
