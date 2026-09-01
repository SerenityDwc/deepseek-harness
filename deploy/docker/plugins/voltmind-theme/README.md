# @voltmind/dsh-theme

VoltClaw 双主题品牌插件：URL `?theme=orange|blue` 切换全站配色与对应品牌的 Logo。

## 能力

- **双主题换色**：基于 DSH 原生 `ctx.theme.overrideTokens` 覆盖 `--dsw-alias-*` 点缀 token
  （品牌主色、新会话按钮、主按钮、会话业务点缀、侧边栏激活项、**品牌色分割线**），克制换色；
  用户浅色/深色/系统偏好不受影响（每个 token 都给浅/深双值）。
- **品牌块**：favicon（当前主题方形图标）、页面标题 `voltclaw AI harness`、
  左上角品牌行（横版 Logo，纯 Logo）、新建会话视图（横版 Logo + 下方欢迎语「数据驱动的研发创新」）。
  原生品牌区（DeepSeek BrandWordmark/FishLogo，内联 SVG）整体替换；DOM 注入 + MutationObserver 自愈。
- **预览开关**：设置 → 外观 →「品牌配色」橙/蓝 cube，点击即时切换（内存态，刷新回 URL 语义）。

## 用法

嵌入地址携带参数（iframe src 或直链）：

```
https://<dsh-web>/?theme=orange
https://<dsh-web>/?theme=blue
```

无参数 / 未知值 → 默认 `orange`。

## 资产

`assets/*.svg`（`logo/` 目录的 4 个官方 SVG，双色品牌标原样内联）→
`scripts/build-assets.mjs` 生成 `src/client/assets.ts`（base64 data URI，免服务端路由）。

## 构建 / 测试 / 挂载

```powershell
pnpm -r build && pnpm -r test
dsh plugin --profile web add link:E:/project/AIworkspace/voltmind-workbench/packages/voltmind-theme
# 重启 dsh web 后生效（runbook §3）
```

## 设计

见 `docs/superpowers/specs/2026-08-17-voltclaw-theme-design.md`。
