// 搜索选项配置
export interface SearchOptions {
  caseSensitive?: boolean; // 区分大小写
  wholeWord?: boolean; // 全字匹配
  useRegex?: boolean; // 使用正则表达式
  include?: string[]; // 包含的文件模式
  exclude?: string[]; // 排除的文件模式
  maxResults?: number; // 最大结果数
  contextLines?: {
    // 上下文行数
    before: number;
    after: number;
  };
  searchInResults?: boolean; // 在结果中搜索
  respectGitIgnore?: boolean; // 是否遵循.gitignore
}

// 搜索结果中的匹配项
export interface SearchMatch {
  line: number; // 行号
  column: number; // 列号
  text: string; // 匹配行文本
  matchText: string; // 匹配的具体文本
  beforeContext: string[]; // 上文
  afterContext: string[]; // 下文
}

// 文件中的搜索结果
export interface FileSearchResult {
  filePath: string; // 文件路径
  matches: SearchMatch[]; // 匹配项列表
}

// 搜索结果统计
export interface SearchStats {
  totalMatches: number; // 总匹配数
  filesSearched: number; // 已搜索文件数
  duration: number; // 搜索耗时(ms)
  status: 'in-progress' | 'completed' | 'cancelled'; // 搜索状态
}
