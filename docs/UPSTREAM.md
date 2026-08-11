# NodeTool 上游基线

本项目基于 [NodeTool](https://github.com/nodetool-ai/nodetool) 改造，保留其
AGPL-3.0 许可证和版权声明。

- 上游仓库：`https://github.com/nodetool-ai/nodetool.git`
- 固定基线提交：`49511a5b3aa1d3d9be06b86db2579d8d3cfbc4bf`
- 导入日期：2026-08-11

升级上游时不要直接覆盖本项目。先创建升级分支，合并指定上游提交，然后运行：

```bash
npm run build:packages
npm run typecheck:web
npm run test:web
npm run health
```

生产部署应使用构建产物或容器，不应运行 Vite/tsx watch 开发服务。
