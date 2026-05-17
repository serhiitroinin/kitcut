import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCameraProvider, Recorder } from "@kitcut/recorder";
import { createWatermarkProcessor } from "@kitcut/processor";
import { createClientRenderer } from "@kitcut/export";
import { createLocalStoragePersistence } from "@kitcut/timeline-core";
import { useEditor } from "@kitcut/editor-react";

type Sources = Map<string, string>; // recordingId -> object URL

function fmt(ms: number): string {
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t * 100) % 100);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(m)}:${p(s)}:${p(cs)}`;
}

const persistence = createLocalStoragePersistence("kitcut-demo");

export function App() {
  const editor = useEditor({ documentId: "demo", persistence });
  const sourcesRef = useRef<Sources>(new Map());

  const [recState, setRecState] = useState<"idle" | "live" | "recording">("idle");
  const [watermark, setWatermark] = useState(true);
  const [exporting, setExporting] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLVideoElement>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const sourceRef = useRef<Awaited<ReturnType<ReturnType<typeof createCameraProvider>["acquire"]>> | null>(null);

  // ── camera lifecycle ──
  const goLive = useCallback(async () => {
    setError(null);
    try {
      const source = await createCameraProvider().acquire({
        kind: "camera",
        width: 1280,
        height: 720,
      });
      sourceRef.current = source;
      if (liveRef.current) {
        liveRef.current.srcObject = source.stream;
        await liveRef.current.play();
      }
      setRecState("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable");
    }
  }, []);

  const startRec = useCallback(async () => {
    if (!sourceRef.current) return;
    const recorder = new Recorder({
      source: sourceRef.current,
      processors: watermark
        ? [createWatermarkProcessor({ text: "kitcut", corner: "br" })]
        : [],
      fps: 30,
    });
    recorderRef.current = recorder;
    await recorder.start();
    setRecState("recording");
  }, [watermark]);

  const stopRec = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    const result = await recorder.stop();
    const id = crypto.randomUUID();
    sourcesRef.current.set(id, result.url);
    editor.addClip(id, result.durationMs);
    recorderRef.current = null;
    setRecState("live");
  }, [editor]);

  useEffect(
    () => () => {
      sourceRef.current?.stop();
    },
    [],
  );

  // ── preview follows the playhead ──
  const { clips, playheadMs, activeClip } = editor;
  const activeUrl = activeClip ? sourcesRef.current.get(activeClip.recordingId) : null;
  useEffect(() => {
    const v = previewRef.current;
    if (!v || !activeClip || !activeUrl) return;
    if (v.dataset.url !== activeUrl) {
      v.src = activeUrl;
      v.dataset.url = activeUrl;
    }
    const into = (playheadMs - activeClip.timelineStartMs) + activeClip.sourceStartMs;
    if (Math.abs(v.currentTime * 1000 - into) > 80) v.currentTime = into / 1000;
  }, [activeClip, activeUrl, playheadMs]);

  // ── export ──
  const onExport = useCallback(async () => {
    setError(null);
    setDownloadUrl(null);
    const exportClips = clips
      .map((c) => {
        const url = sourcesRef.current.get(c.recordingId);
        return url
          ? { sourceUrl: url, inMs: c.sourceStartMs, outMs: c.sourceEndMs }
          : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (exportClips.length === 0) return;
    setExporting(0);
    try {
      const result = await createClientRenderer().export(
        { format: "webm", timeline: { width: 1280, height: 720, fps: 30, clips: exportClips } },
        { onProgress: (p) => setExporting(Math.round(p.progress * 100)) },
      );
      setDownloadUrl(result.url ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }, [clips]);

  const totalPx = Math.max(1, editor.msToPx(editor.totalDurationMs));

  const onRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      editor.seek(editor.pxToMs(e.clientX - rect.left));
    },
    [editor],
  );

  const stack = useMemo(
    () => [
      "@kitcut/recorder",
      "@kitcut/processor",
      "@kitcut/timeline-core",
      "@kitcut/editor-react",
      "@kitcut/export",
    ],
    [],
  );

  return (
    <div className="app">
      <div className="grain" aria-hidden />
      <header className="bar">
        <div className="bar__l">
          <span className={`rec ${recState === "recording" ? "on" : ""}`}>
            <i />
            {recState === "recording" ? "REC" : "STDBY"}
          </span>
          <span className="proj">
            kitcut<span className="dim">/studio</span>
          </span>
        </div>
        <span className="tc">{fmt(playheadMs)}</span>
        <div className="bar__r">
          <span className="dim save">{editor.saveStatus}</span>
          <a className="gh" href="https://github.com/serhiitroinin/kitcut" target="_blank" rel="noopener">
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="grid">
        <section className="panel record">
          <h2>
            <span className="no">01</span> Capture
          </h2>
          <div className="stage">
            <video ref={liveRef} className="vid" muted playsInline />
            {recState === "idle" && <div className="ph">camera off</div>}
          </div>
          <label className="wm">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              disabled={recState === "recording"}
            />
            watermark processor
          </label>
          <div className="row">
            {recState === "idle" && (
              <button className="btn" onClick={goLive}>
                Enable camera
              </button>
            )}
            {recState === "live" && (
              <button className="btn cut" onClick={startRec}>
                ● Record
              </button>
            )}
            {recState === "recording" && (
              <button className="btn" onClick={stopRec}>
                ■ Stop
              </button>
            )}
          </div>
          {error && <p className="err">{error}</p>}
        </section>

        <section className="panel preview">
          <h2>
            <span className="no">02</span> Preview
          </h2>
          <div className="stage">
            <video ref={previewRef} className="vid" muted playsInline />
            {clips.length === 0 && <div className="ph">record a take to begin</div>}
          </div>
          <div className="transport">
            <button className="btn sm" onClick={editor.togglePlay} disabled={!clips.length}>
              {editor.isPlaying ? "❚❚" : "▶"}
            </button>
            <button className="btn sm" onClick={() => editor.seek(0)} disabled={!clips.length}>
              ⏮
            </button>
            <button className="btn sm" onClick={editor.undo} disabled={!editor.canUndo}>
              ↶
            </button>
            <button className="btn sm" onClick={editor.redo} disabled={!editor.canRedo}>
              ↷
            </button>
            <div className="zoom">
              <button className="btn sm" onClick={editor.zoomOut}>
                −
              </button>
              <span className="dim">{Math.round(editor.pxPerSec)}px/s</span>
              <button className="btn sm" onClick={editor.zoomIn}>
                +
              </button>
            </div>
          </div>
        </section>

        <section className="panel timeline">
          <div className="th">
            <h2>
              <span className="no">03</span> Timeline
            </h2>
            <div className="row">
              <button
                className="btn sm"
                disabled={!editor.activeClip}
                onClick={() => editor.activeClip && editor.splitClip(editor.activeClip.id, playheadMs)}
              >
                Split
              </button>
              <button
                className="btn sm"
                disabled={!editor.selectedClipId}
                onClick={() => editor.selectedClipId && editor.removeClip(editor.selectedClipId)}
              >
                Delete
              </button>
              <button className="btn cut sm" disabled={!clips.length || exporting !== null} onClick={onExport}>
                {exporting !== null ? `Exporting ${exporting}%` : "Export ↓"}
              </button>
            </div>
          </div>

          <div className="ruler" onClick={onRulerClick}>
            <div className="track" style={{ width: totalPx }}>
              {clips.map((c) => {
                const w = editor.msToPx(c.sourceEndMs - c.sourceStartMs);
                const x = editor.msToPx(c.timelineStartMs);
                return (
                  <div
                    key={c.id}
                    className={`clip ${editor.selectedClipId === c.id ? "sel" : ""}`}
                    style={{ left: x, width: Math.max(8, w) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.selectClip(c.id);
                    }}
                  >
                    <span className="clip__t">{fmt(c.sourceEndMs - c.sourceStartMs)}</span>
                  </div>
                );
              })}
              <div className="playhead" style={{ left: editor.msToPx(playheadMs) }} />
            </div>
          </div>

          {downloadUrl && (
            <a className="dl" href={downloadUrl} download="kitcut-export.webm">
              ↓ download kitcut-export.webm
            </a>
          )}

          <p className="builtwith">
            built entirely from{" "}
            {stack.map((s, i) => (
              <span key={s}>
                <code>{s}</code>
                {i < stack.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </section>
      </main>
    </div>
  );
}
