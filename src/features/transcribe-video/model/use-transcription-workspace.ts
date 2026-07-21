import { useEffect, useMemo, useState } from "react";
import type { ModelStatus, Stage, ToolStatus, TranscriptChunk, TranscriptionResult } from "../../../entities/transcription";
import { backend } from "../../../shared/api";

export const isYouTubeUrl = (value: string) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value.trim());

export function useTranscriptionWorkspace() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("auto");
  const [model, setModel] = useState("base");
  const [outputDir, setOutputDir] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("링크를 붙여 넣고 변환을 시작하세요");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [tools, setTools] = useState<ToolStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptChunk[]>([]);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [modelDownload, setModelDownload] = useState<{model: string; progress: number} | null>(null);

  useEffect(() => {
    backend.dependencies().then(setTools).catch(() => setTools({ yt_dlp: false, ffmpeg: false, whisper: false }));
    backend.models().then(setModels).catch(() => setModels([]));
    const subscriptions = [
      backend.onProgress(({ payload }) => { setStage(payload.stage); setProgress(payload.progress); setMessage(payload.message); if (payload.detail) setStreamLines((lines) => [...lines, payload.detail!].slice(-80)); }),
      backend.onTranscript(({ payload }) => setLiveTranscript((chunks) => chunks[chunks.length - 1]?.text === payload.text ? chunks : [...chunks, payload])),
      backend.onModelProgress(({ payload }) => setModelDownload((current) => ({ model: current?.model || "model", progress: payload.progress }))),
    ];
    return () => { subscriptions.forEach((subscription) => subscription.then((unlisten) => unlisten())); };
  }, []);

  const busy = !["idle", "done", "error"].includes(stage);
  const urlValid = isYouTubeUrl(url);
  const canStart = Boolean(urlValid && !busy && tools?.yt_dlp && tools.ffmpeg && tools.whisper);
  const selectedModelDownloaded = models.find((item) => item.name === model)?.downloaded ?? false;
  const stageLabel = useMemo(() => ({ idle: "준비", metadata: "영상 확인", download: "다운로드", extract: "오디오 정리", transcribe: "음성 인식", done: "완료", error: "오류" }[stage]), [stage]);

  async function start() {
    if (!canStart) return;
    setResult(null); setStreamLines([]); setLiveTranscript([]); setStage("metadata"); setProgress(2); setMessage("영상 정보를 불러오는 중…");
    try { const value = await backend.transcribe({ url: url.trim(), language, model, outputDir: outputDir || null }); setResult(value); setStage("done"); setProgress(100); setMessage("텍스트 변환이 완료되었습니다"); }
    catch (error) { setStage("error"); setMessage(String(error)); }
  }

  async function downloadSelectedModel() {
    setModelDownload({ model, progress: 1 });
    try { await backend.downloadModel(model); setModels(await backend.models()); }
    catch (error) { setMessage(String(error)); setStage("error"); }
    finally { setModelDownload(null); }
  }

  async function deleteSelectedModel() {
    if (!window.confirm(`${model.toUpperCase()} 모델을 이 컴퓨터에서 삭제할까요? 필요하면 다시 다운로드할 수 있습니다.`)) return;
    try { await backend.deleteModel(model); setModels(await backend.models()); }
    catch (error) { setMessage(String(error)); setStage("error"); }
  }

  async function chooseFolder() { const selected = await backend.chooseOutputDirectory(); if (typeof selected === "string") setOutputDir(selected); }
  async function copyTranscript() {
    const text = result?.transcript || liveTranscript.map((chunk) => chunk.text).join("\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  function resetError() { setStage("idle"); setProgress(0); }

  return { url, setUrl, language, setLanguage, model, setModel, outputDir, stage, progress, message, result, tools, copied, streamLines, liveTranscript, models, modelDownload, busy, urlValid, canStart, selectedModelDownloaded, stageLabel, start, downloadSelectedModel, deleteSelectedModel, chooseFolder, copyTranscript, resetError };
}
