/**
 * react 类型 shim：monorepo 未装 @types/react，而本包客户端 bundle 只消费
 * useState + jsx/jsxs（react 在运行时由 dsh 的 __ModuleLoader__ 提供共享实例）。
 * 足够支撑 tsc 编译；完整类型以运行时为准。
 */

declare module 'react' {
  export function useState<S>(initialState: S | (() => S)): [S, (next: S | ((prev: S) => S)) => void]
  export type ReactNode = unknown
  export type FC<P = Record<string, unknown>> = (props: P) => ReactNode
}

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown
  export function jsxs(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown
}
