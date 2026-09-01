# bda-api-pass

DSH 插件:按配置文件把 BDA 平台 API 暴露为 agent 工具(查询 / 下载),Token 按 `AUTH_API.md` 的凭证流程自动获取与续期。

## 工作原理

```
BDA_AUTH_USER + AUTH_ADMIN_KEY (容器环境变量)
    │
    ├─ POST {authBaseUrl}/api/auth/credential   (X-Admin-Key)   → credential(缓存至 expireAt)
    ├─ POST {authBaseUrl}/api/auth/token        {credential}    → token(缓存至 expiresIn,提前60s刷新)
    │
    └─ 每个配置的 API 注册为一个工具 bda_<name>
        请求头携带 X-Access-Token → 401 自动换 token 重试一次
```

- 凭证过期(HTTP 400)自动重新生成凭证再换 token
- 用户被冻结(403)/不存在(404)时给出明确错误
- token 与 credential 均只存进程内存,不出现在日志与工具结果中

## 环境变量(容器内必须设置)

| 变量 | 说明 |
|---|---|
| `BDA_AUTH_USER` | 平台用户名(如 `zhangsan`) |
| `AUTH_ADMIN_KEY` | 凭证服务管理密钥(对应 data-analysis-backend 的 `AUTH_ADMIN_KEY`) |
| `BDA_AUTH_BASE_URL` | 可选,凭证服务地址,默认 `http://127.0.0.1:8080` |
| `BDA_API_BASE_URL` | 可选,业务 API 基址(前端代理/网关),默认 `http://127.0.0.1:3100` |

## API 工具列表（远程模式）

插件始终从 data-analysis-backend 拉取 API 工具列表（`GET /api/apis`，接口契约见 `AUTH_API.md` 第 9 节），启动拉取一次，之后每 `BDA_APIS_REFRESH_SECONDS`（默认 300）轮询，服务端更新后自动热更新，无需重新分发插件。

| 环境变量/配置 | 说明 |
|---|---|
| `BDA_APIS_URL` / config `apisUrl` | 列表接口地址，**默认 `{BDA_AUTH_BASE_URL}/api/apis`**，一般无需单独设置 |
| `BDA_APIS_REFRESH_SECONDS` / config `apisRefreshSeconds` | 轮询间隔秒数，默认 300 |

- 请求携带 `X-Admin-Key`（取自 `AUTH_ADMIN_KEY` 环境变量，若设置）
- 拉取成功写入本地缓存 `~/.dsh/bda-api-pass/apis.cache.json`；断网/服务不可用时：已有工具保持不变，首次启动失败则降级用缓存，无缓存用内置默认列表
- 内容无变化（JSON 完全一致）时跳过重新注册，工具不闪断
- 列表的增删改通过服务端管理接口（`POST /api/apis`、`DELETE /api/apis/{name}`）或直接操作 `bda_plugin_api` 表

```json
{
  "apis": [
    {
      "name": "tag_group_list",
      "description": "查询设计模块标签组列表",
      "method": "POST",
      "path": "/jeecgboot/design/tag_group/manager/list",
      "headers": { "X-App-Id": "dBatteryInnovator" },
      "requestExample": {},
      "responseExample": { "success": true, "result": { "records": [] } }
    },
    {
      "name": "export_experiment",
      "description": "导出实验数据为Excel文件",
      "method": "GET",
      "path": "/jeecgboot/experiment/export",
      "download": true
    }
  ]
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✓ | 工具名后缀,`^[a-z][a-z0-9_]*$`,工具名为 `bda_<name>` |
| `description` | ✓ | 给 agent 看的功能描述 |
| `method` | ✓ | `GET` / `POST` / `PUT` / `DELETE` |
| `path` | ✓ | 以 `/` 开头;支持 `{param}` 路径模板,值从工具入参取 |
| `headers` | | 附加请求头(如 `X-App-Id`) |
| `requestExample` | | 请求示例,拼进工具描述供模型参考 |
| `requestSchema` | | 工具入参 JSON Schema;缺省为宽松 object |
| `responseExample` | | 返回示例,拼进工具描述供模型参考 |
| `download` | | `true` 时为下载工具:响应体存文件,返回路径与大小 |

请求组装规则:
- `GET`:入参(除路径模板和 `saveAs`)全部拼为 query string
- 其他 method:入参作为 JSON body
- 下载工具额外接受可选 `saveAs`(文件名,相对名落在下载目录,绝对路径直接使用)

## 插件 config(cordis.patch.yml 可覆盖)

```yaml
- insert:
    - id: bda-api-pass
      name: 'bda-api-pass'
      config:
        authBaseUrl: http://da-backend:8080
        apiBaseUrl: http://frontend:3100
        apisUrl: http://da-backend:8080/api/apis
        downloadDir: /data/downloads
        toolPrefix: bda
        requestTimeoutMs: 60000
        downloadTimeoutMs: 300000
        maxResponseChars: 64000
        maxDownloadBytes: 209715200
        credentialTtlSeconds: 3600
        apisRefreshSeconds: 300
```

## 注册的工具

- `bda_apis` — 列出全部已配置的 API(agent 发现入口)
- `bda_<name>` — 每个配置的 API 一个工具;查询型返回 `{status, ok, body, truncated}`,下载型返回 `{status, file, bytes, contentType}`

## 安装

```bash
dsh plugin --profile web add bda-api-pass        # 发布后
# 或本地开发:在 ~/.dsh/profiles/web 下
# pnpm add link:C:/Work/Fork/aiworkspace/packages/bda-api-pass
# 然后在 profile 的 cordis.patch.yml 手动加 insert 行(不要同时走 bundles,避免重复挂载)
```

## 开发

```bash
npm install
npm run build        # tsdown → lib/
npm run typecheck
```
