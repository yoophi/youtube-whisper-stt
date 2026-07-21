# A2 의존성을 코드 복사 없이 A1에서 사용하기

## 별칭

- **A1** — 현재 프로젝트: `~/project/youtube-whisper-stt` (hushline 초기 스냅샷을 담은 standalone repo)
- **A2** — `~/project/agentic-workspace/apps/hushline` (공유 monorepo 위에서 ACP AI 에이전트 기능이 추가된 진화 버전)

## 핵심 전제

A2가 A1 대비 새로 끌어오는 의존성은 2개이며, 두 의존성의 transitive 그래프가 깨끗하다.
그래서 나머지 monorepo를 통째로 가져오지 않고 이 둘만 "제자리 참조(reference-in-place)"할 수 있다.

| 의존성 | 종류 | 자체 의존성 | 빌드 산출물 |
|---|---|---|---|
| `@yoophi/agent-client` | pnpm 패키지 (private) | `@tauri-apps/api ^2.8.0` **뿐** (A1도 이미 `^2.8.0` 보유) | 없음 — `./src/index.ts` 원본 TS를 그대로 export |
| `acp-agent-core` | Rust crate | 전부 crates.io (`tokio`, `anyhow`, `agent-client-protocol` 등) — cross-repo path 의존 없음 | cargo가 빌드 |

두 의존성 모두 다른 `@yoophi/*` 패키지나 다른 로컬 크레이트에 의존하지 않으므로, 이 둘만 연결하면 된다.

---

## 방법 1 — 로컬 심볼릭 링크 (같은 머신 개발용, 권장)

### 1) Rust: Cargo path 의존

`A1/apps/hushline/src-tauri/Cargo.toml` 의 `[dependencies]` 에 A2와 동일하게 추가하되, 경로만 A2 위치로 조정한다.

```toml
acp-agent-core = { path = "../../../../agentic-workspace/crates/acp-agent-core" }
tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync", "time", "process"] }
```

- 경로 `../../../../agentic-workspace/crates/acp-agent-core` 는 `A1/apps/hushline/src-tauri` 기준 실제 상대경로다.
- workspace 바깥 crate를 path 의존으로 참조하는 것은 Cargo에서 정상 동작한다. A1 workspace member로 넣지 않고 hushline에 컴파일되어 들어간다.

### 2) JS: pnpm `link:` 프로토콜

`A1/apps/hushline/package.json` 의 `dependencies` 에 추가한다.

```json
"@yoophi/agent-client": "link:../../../agentic-workspace/packages/agent-client"
```

이후 `pnpm install`. `link:` 는 복사 없이 A2 디렉터리로 심볼릭 링크를 걸며, A2에서 수정하면 A1에 즉시 반영된다.

### 3) Vite 설정 보강 (필수 — 함정 지점)

`agent-client` 가 빌드 산출물 없이 raw `.ts` 를 export하고 프로젝트 루트 밖에 있으므로, Vite가 그 파일을 서빙하도록 허용해야 한다. `A1/apps/hushline/vite.config.ts`:

```ts
server: {
  port: 1425, strictPort: true, host: "127.0.0.1",
  fs: { allow: ["..", "/Users/yoophi/project/agentic-workspace/packages/agent-client"] },
},
```

Vite는 기본적으로 프로젝트 루트 밖 파일 접근을 막는다. A2에서는 같은 workspace라 문제가 없었지만 A1에서는 명시해야 한다.

---

## 방법 2 — Git 의존 (CI · 재현성 · 다른 머신 빌드용)

로컬 경로에 의존하지 않으려면(예: A1을 다른 곳에서 빌드) git 참조로 전환한다.

```toml
# Cargo.toml
acp-agent-core = { git = "https://.../agentic-workspace.git", package = "acp-agent-core" }
```

```json
// package.json — 서브디렉터리 지정
"@yoophi/agent-client": "git+https://.../agentic-workspace.git#path:packages/agent-client"
```

단, `agent-client` 는 빌드 산출물이 없어 git 소비 시 A1 빌드 파이프라인이 그 TS를 트랜스파일해줘야 한다(Vite면 OK). 크레이트는 문제없음.

---

## 권장

- **같은 머신에서 A1을 실험 / 개발** → 방법 1 (path + `link:` + Vite `fs.allow`). 복사 없음, 실시간 반영, 가장 단순.
- **A1을 독립 배포 · CI 빌드해야 함** → 방법 2 (git). 또는 두 패키지를 사설 레지스트리(npm / crates)에 publish 후 버전으로 소비.

## 짚어둘 점

1. 이 문서는 **의존성 배선**만 다룬다. A1의 hushline은 아직 `agent-client` / `acp-agent-core` 를 호출하는 코드(A2의 `agent.rs`, `agent.ts`, organize / chat 기능)가 없으므로, 실제로 "사용"하려면 그 소비 코드도 A1에 있어야 한다 — 이것도 복사 대신 심볼릭 링크로 참조할지 결정이 필요하다.
2. 방법 1에서 A2 쪽 `acp-agent-core` 가 A2의 `Cargo.lock` 과 A1의 `Cargo.lock` 에서 각각 독립 해석되므로, 두 앱이 동시에 빌드될 때 crates.io 버전 정합만 맞으면 충돌이 없다.
