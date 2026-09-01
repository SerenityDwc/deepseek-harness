import { defineConfig } from 'tsdown'

const PKG_NAME = '@voltmind/dsh-theme'

/**
 * voltmind-theme 双入口打包：
 * - index  → 服务端插件入口（lib/index.js，ESM，最小 no-op）
 * - client → Web 客户端入口（lib/client.js，**CJS 输出 + external**）
 *
 * client 输出 CJS 的原因：dsh web 以 classic script 注入 client bundle（工厂内 `require`），
 * 平台模块（react / react/jsx-runtime / @deepseek-ai/*）必须在运行时由 __ModuleLoader__ 解析
 * （共享同一实例，避免 React 双实例 hooks 失效）。参考同 profile 的 dsh-at-file / dsh-files。
 * dshClientWrap 负责包一层 window.__ModuleLoader__.load({ id, factory })；
 * CJS 输出已含 exports.* 赋值，尾部 export 替换正则不命中时保持原样，前缀+return 仍成立。
 */
function dshClientWrap(id: string) {
  return {
    name: 'dsh-client-module-loader',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderChunk(code: string, chunk: any): string | null {
      if (chunk.fileName !== 'client.js') return null
      // ESM 输出尾部为 `export { ... };` → 替换为 exports.* 赋值 + 闭合工厂；
      // CJS 输出已含 exports.* 赋值 → 直接补闭合工厂。两者统一以 factory 内
      // `return module.exports; }` 收尾，再包 __ModuleLoader__.load({...})。
      const tailExport = /\nexport\s*\{([^}]+)\};\s*$/
      const match = tailExport.exec(code)
      let body: string
      if (match) {
        const keys = match[1].split(',').map((s: string) => s.trim()).filter(Boolean)
        body = code.slice(0, match.index) +
          '\n' + keys.map((k: string) => `\t\texports.${k} = ${k};`).join('\n') +
          '\n\t\treturn module.exports;\n\t}'
      } else {
        body = code + '\n\t\treturn module.exports;\n\t}'
      }
      return (
        `window.__ModuleLoader__.load({\n` +
        `\tid: ${JSON.stringify(id)},\n` +
        `\tfactory: (require) => {\n` +
        `\t\tvar module = { exports: {} };\n` +
        `\t\tvar exports = module.exports;\n` +
        `\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });\n` +
        body +
        `\n});`
      )
    },
  }
}

/** 客户端 bundle 必须 external 的平台模块（运行时 loader 解析，共享实例）。 */
const CLIENT_EXTERNAL = [/^react($|\/)/, /^react-dom($|\/)/, /^@deepseek-ai\//]

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    fixedExtension: false,
    clean: false,
    dts: false,
    sourcemap: true,
    hash: false,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    fixedExtension: false,
    // CJS 在 type:module 包下默认输出 .cjs；强制 .js 以匹配 package.json exports 与
    // dshClientWrap 的 chunk.fileName 判断（dsh web 加载 lib/client.js）。
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    clean: false,
    dts: false,
    sourcemap: true,
    hash: false,
    external: CLIENT_EXTERNAL,
    plugins: [dshClientWrap(PKG_NAME)],
  },
])
