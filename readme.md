# 仿 vscode-search 的代码重构 mcp 工具

## 使用

### 在 cline 中使用

增加 mcp 工具设置：

```json
"cpu-vscode-search": {
  "command": "npx",
  "args": [
    "-y",
    "@cpu-search/vscode-search",
    "--root",
    "${workspaceFolder}"
  ],
  "disabled": false,
  "autoApprove": []
}
```

### MCP 工具使用示例

```javascript
// 生成搜索报告
generateSearchReport({
  searchPattern: 'someText',
  // rootPath参数可省略，会使用命令行--root参数值
  options: { include: ['*.ts', '*.tsx'], exclude: ['node_modules/**'] },
});

// 搜索并替换
searchAndReplace({
  searchPattern: 'oldText',
  replaceText: 'newText',
  // rootPath参数可省略，会使用命令行--root参数值
  options: { caseSensitive: true },
});

// 应用报告修改
applyReportChange({
  reportText: 'generateSearchReport 报告修改后的内容',
  // rootPath参数可省略，会使用命令行--root参数值
});
```

## 开发

1. 安装依赖

```bash
pnpm install
```

2. 常用脚本（在根目录执行）

```bash
pnpm build      # 构建所有 packages
pnpm dev        # 启动所有 packages 的开发模式
pnpm test       # 执行所有单元测试
pnpm lint       # 静态代码检查
pnpm format     # 代码格式化
```

3. 各 Package 说明

### packages/core

- 位置: `packages/core`
- 类型: 核心搜索引擎库
- 主要功能: 提供文件搜索、生成报告、替换功能
- 开发脚本:
  ```bash
  pnpm --filter core build
  pnpm --filter core dev    # watch 模式
  pnpm --filter core test   # 执行 jest 测试
  pnpm --filter core lint
  pnpm --filter core format
  ```
- 目录结构:
  - `src/` 源代码
  - `test/` 单元测试及测试用例
  - `jest.config.cjs` 测试配置
  - `tsconfig.json` TypeScript 配置

### packages/mcp

- 位置: `packages/mcp`
- 类型: MCP 服务适配层
- 主要功能: 在 Model Context Protocol (MCP) 上暴露搜索和重构工具
- 开发脚本:
  ```bash
  pnpm --filter mcp build
  pnpm --filter mcp dev    # 启动 MCP 服务 (stdio)
  pnpm --filter mcp test   # 若有测试
  pnpm --filter mcp lint
  pnpm --filter mcp format
  ```
- 目录结构:
  - `src/` 包含 `index.ts` 主入口
  - `tsconfig.json` TypeScript 配置

4. 发布流程

```bash
pnpm version <major|minor|patch>   # 更新版本
pnpm publish -r                   # 发布所有 packages
```

5. 其他说明

- 所有 packages 均使用 TypeScript，并由根目录统一管理依赖并运行脚本。
- 开发过程中可结合 VS Code 插件 (ESLint、Prettier) 保持代码规范。
