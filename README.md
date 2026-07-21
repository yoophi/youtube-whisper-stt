# Hushline

YouTube 영상에서 음성을 추출하고 로컬 Whisper 엔진으로 텍스트를 생성하는 데스크톱 앱입니다. 다운로드부터 음성 인식까지 사용자의 컴퓨터에서 처리하며, 생성되는 문장을 실시간으로 확인할 수 있습니다.

## 주요 기능

- YouTube 및 `youtu.be` URL 입력
- `yt-dlp` 또는 `youtube-dl`을 이용한 오디오 다운로드
- FFmpeg 기반 WAV 음성 추출
- OpenAI Whisper와 whisper.cpp 지원
- Tiny, Base, Small, Medium, Large 모델 선택
- 앱 안에서 OpenAI Whisper 모델 다운로드 및 삭제
- 자동 언어 감지 또는 음성 언어 직접 선택
- 다운로드 및 STT 진행률 실시간 표시
- 생성되는 Transcript를 타임스탬프와 함께 실시간 스트리밍
- 결과 텍스트 복사 및 TXT/WAV 파일 열기
- 출력 폴더 직접 선택

기본 출력 경로는 `~/Downloads/Hushline`이며 앱에서 변경할 수 있습니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Desktop | Tauri 2, Rust |
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui 스타일 컴포넌트, Lucide Icons |
| Download | yt-dlp 또는 youtube-dl |
| Audio | FFmpeg |
| STT | OpenAI Whisper 또는 whisper.cpp |

## 사전 준비

개발 환경에는 Node.js, pnpm 9, Rust가 필요합니다.

### macOS

```bash
brew install yt-dlp ffmpeg
pipx install openai-whisper
```

`pipx` 대신 Python 환경에 직접 설치할 수도 있습니다.

```bash
python3 -m pip install -U openai-whisper
```

설치 확인:

```bash
yt-dlp --version
ffmpeg -version
whisper --help
```

앱은 일반 `PATH`와 다음 위치에서 실행 파일을 자동 탐색합니다.

- `/opt/homebrew/bin`
- `/usr/local/bin`
- `/usr/bin`
- `~/.local/bin`
- `~/.pyenv/shims`

## 설치 및 실행

```bash
git clone https://github.com/yoophi/youtube-whisper-stt.git
cd youtube-whisper-stt
corepack enable
pnpm install
pnpm tauri:dev
```

프런트엔드만 실행하려면 다음 명령을 사용합니다. Tauri IPC가 필요한 기능은 브라우저에서 동작하지 않습니다.

```bash
pnpm dev
```

UI 컴포넌트 카탈로그는 Storybook으로 실행합니다.

```bash
pnpm storybook
```

브라우저에서 `http://localhost:6006`을 열면 Atomic Design의 Atoms, Molecules, Organisms, Pages 분류로 컴포넌트를 확인할 수 있습니다.

## 사용 방법

1. 앱 상단에서 yt-dlp, FFmpeg, Whisper가 준비되었는지 확인합니다.
2. 사용할 Whisper 모델을 선택합니다.
3. 모델이 설치되지 않았다면 다운로드 버튼을 누릅니다.
4. 음성 언어를 선택하거나 `자동 감지`를 유지합니다.
5. YouTube URL을 입력하고 `변환 시작`을 누릅니다.
6. 오른쪽 Transcript 패널에서 생성되는 텍스트를 실시간으로 확인합니다.
7. 변환이 끝나면 텍스트를 복사하거나 TXT/WAV 파일을 엽니다.

다운로드된 모델을 선택하면 다운로드 버튼이 휴지통 버튼으로 바뀝니다. 삭제 전 확인 대화상자가 표시되며, 삭제한 모델은 나중에 다시 받을 수 있습니다.

## Whisper 모델

| 모델 | 특성 | 권장 용도 |
| --- | --- | --- |
| Tiny | 가장 빠르고 가벼움 | 기능 확인, 짧은 음성 |
| Base | 속도와 품질의 균형 | 일반적인 영상 |
| Small | 더 높은 인식 정확도 | 인터뷰, 강의 |
| Medium | 높은 품질, 많은 자원 사용 | 정확도가 중요한 작업 |
| Large | 최고 품질, 가장 느리고 무거움 | 고품질 최종 결과 |

OpenAI Whisper 모델은 기본적으로 `~/.cache/whisper`에 저장됩니다. `XDG_CACHE_HOME`이 설정되어 있으면 해당 디렉터리 아래의 `whisper` 폴더를 사용합니다.

## whisper.cpp 사용

앱은 `whisper-cli`도 자동으로 탐색합니다. whisper.cpp를 사용할 때는 ggml 모델 경로를 환경 변수로 지정한 상태에서 앱을 실행해야 합니다.

```bash
export WHISPER_MODEL_PATH=/absolute/path/to/ggml-base.bin
pnpm tauri:dev
```

앱 내부 모델 다운로드와 삭제 기능은 OpenAI Whisper의 `.pt` 모델을 대상으로 합니다. whisper.cpp의 ggml 모델은 직접 관리해야 합니다.

## 실시간 이벤트

Rust 백엔드는 Tauri 이벤트를 통해 프런트엔드에 상태를 전달합니다.

| 이벤트 | 설명 |
| --- | --- |
| `pipeline-progress` | 메타데이터, 다운로드, 추출, STT 진행 상태 |
| `transcript-chunk` | 생성된 문장과 오디오 타임스탬프 |
| `model-download-progress` | Whisper 모델 다운로드 진행률 |

Transcript 이벤트 형식:

```ts
type TranscriptChunk = {
  text: string;
  timestamp?: string;
};
```

## 아키텍처

### Monorepo

```text
youtube-whisper-stt/
├── apps/
│   └── hushline/          # React + Tauri 데스크톱 앱
├── packages/              # 향후 cross-app 공유 패키지
├── Cargo.toml             # Rust workspace
├── package.json           # pnpm/Turbo 루트 명령
├── pnpm-workspace.yaml
└── turbo.json
```

pnpm workspace와 Turborepo가 JavaScript 작업을 관리하고, 루트 Cargo workspace가 Tauri Rust crate를 관리합니다.

### Frontend: Feature-Sliced Design

```text
apps/hushline/src/
├── app/                         # 앱 진입점과 전역 스타일
├── pages/transcription/         # STT 페이지 조합
├── widgets/
│   ├── app-header/              # 앱 헤더와 엔진 상태
│   └── transcript-panel/        # 결과 및 실시간 Transcript
├── features/transcribe-video/  # 변환과 모델 관리 유스케이스 상태
├── entities/transcription/     # Transcript 도메인 타입
└── shared/
    ├── api/                     # Tauri IPC 어댑터
    ├── lib/                     # 공용 유틸리티
    └── ui/                      # 공용 UI 컴포넌트
```

의존성은 `app → pages → widgets/features → entities → shared` 방향을 따릅니다.

### Backend: Hexagonal Architecture

```text
apps/hushline/src-tauri/src/
├── domain.rs              # 도메인 모델과 검증 규칙
├── application.rs         # STT 및 모델 관리 유스케이스
├── ports.rs               # 외부 시스템과 이벤트 포트
├── adapters/
│   ├── tauri.rs           # Tauri IPC 인바운드 어댑터
│   └── system.rs          # yt-dlp, Whisper, 파일시스템 어댑터
├── lib.rs                 # 모듈 조립
└── main.rs                # 실행 진입점
```

애플리케이션 계층은 Tauri나 프로세스 실행 구현에 직접 의존하지 않으며 `ToolchainPort`와 `EventPort`를 통해 외부 시스템과 통신합니다.

## 빌드와 검증

프런트엔드 프로덕션 빌드:

```bash
pnpm build
```

Storybook 정적 빌드:

```bash
pnpm build-storybook
```

Rust 테스트와 정적 검사:

```bash
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

데스크톱 앱 패키징:

```bash
pnpm tauri:build
```

생성되는 설치 파일은 `target/release/bundle` 아래에서 확인할 수 있습니다.

## 문제 해결

### 앱에서 실행 파일을 찾지 못하는 경우

터미널에서 각 명령을 실행해 설치 여부를 확인한 다음 앱을 다시 시작합니다. GUI 앱은 셸의 최신 `PATH`를 즉시 반영하지 않을 수 있습니다.

### Whisper 모델 다운로드가 실패하는 경우

- `whisper --help`가 정상 실행되는지 확인합니다.
- Python 환경에서 `import whisper`가 가능한지 확인합니다.
- 모델 파일을 받을 수 있도록 네트워크 연결과 디스크 공간을 확인합니다.

### whisper.cpp 모델을 찾지 못하는 경우

`WHISPER_MODEL_PATH`가 절대 경로인지, 해당 ggml 파일이 실제로 존재하는지 확인합니다.

### 변환 속도가 느린 경우

Tiny 또는 Base 모델을 사용해 보세요. Medium과 Large 모델은 CPU 환경에서 상당한 시간이 걸릴 수 있습니다.

## 개인정보 및 저작권

오디오 추출과 STT 처리는 로컬에서 수행됩니다. 다만 YouTube 영상 다운로드 과정에서는 YouTube 및 관련 서버와 네트워크 통신이 발생합니다.

이 앱은 사용 권한이 있는 콘텐츠에만 사용해야 합니다. YouTube 이용약관과 해당 콘텐츠의 저작권을 준수하세요.
