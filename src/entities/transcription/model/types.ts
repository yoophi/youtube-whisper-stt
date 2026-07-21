export type Stage = "idle" | "metadata" | "download" | "extract" | "transcribe" | "done" | "error";
export type ProgressEvent = { stage: Stage; progress: number; message: string; detail?: string };
export type TranscriptChunk = { text: string; timestamp?: string };
export type ToolStatus = { yt_dlp: boolean; yt_dlp_version?: string; yt_dlp_error?: string; ffmpeg: boolean; whisper: boolean; whisper_command?: string };
export type TranscriptionResult = { title: string; transcript: string; transcript_path: string; audio_path: string; duration_seconds?: number };
export type ModelStatus = { name: string; downloaded: boolean; path: string };
