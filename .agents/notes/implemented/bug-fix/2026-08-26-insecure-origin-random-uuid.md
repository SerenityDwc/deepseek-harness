# Agent Note: Mint browser RPC ids without secure-context randomUUID

Status: implemented

English | [中文](2026-08-26-insecure-origin-random-uuid.zh.md)

## Problem

VoltClaw opens the Web UI at `http://<lan-ip>:<port>/`. That origin is not a secure context, so browsers omit `crypto.randomUUID`. `AbstractApiClient.mintRpcId` called it on every unary RPC, so provider-directory and agent-preset loads failed with `crypto.randomUUID is not a function`. Opening `http://127.0.0.1:<port>/` works because loopback is a secure context. The Docker access-token proxy is not the cause.

## Decision

`AbstractApiClient.mintRpcId` uses `crypto.randomUUID` when present and otherwise builds an RFC 4122 v4 UUID from `crypto.getRandomValues`, which insecure HTTP origins still expose. Conversation draft attachment ids use the same fallback. Generic connection RPC already minted through `randomUuid()` in `dsh-client-connection`.

## Alternatives considered

- **Serve the workbench only on localhost or HTTPS.** Rejected as the only path: VoltClaw hires containers on a remote Docker host and opens a LAN IP URL from another machine.
- **Polyfill `crypto.randomUUID` on `window` from `index.html`.** Rejected as the only path: the mint site should not depend on a page-global side effect, and tests already stub `crypto` without `randomUUID`.

## Consequences

- Unary RPCs from `http://<ip>:<port>` succeed without a secure context.
- Attachment drafts also mint on those origins.
- Operators still rebuild the Web image after this change; already-running containers keep the previous client bundle until recreated.

## Testing

`packages/host/apiproxy/tests/fetch-carrier.spec.ts` stubs `crypto` to `getRandomValues` only and asserts the minted rpcId. `packages/client/connection/tests/client-apply.client.spec.ts` already covers the generic RPC caller on the same stub.
