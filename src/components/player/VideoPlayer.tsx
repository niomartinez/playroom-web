"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Hls from "hls.js";

/**
 * Live video player for a baccarat table.
 *
 * Playback strategy, in order of preference:
 *   1. **WebRTC (WHEP)** — sub-second latency. Primary path on all
 *      Chromium/Firefox/Safari ≥17.
 *   2. **HLS** — 2-4 s latency. Fallback for older Safari and any
 *      browser where WebRTC negotiation fails.
 *   3. **Fallback child** — whatever the parent passes (typically the
 *      DealVisualizer placeholder showing card animations). Shown
 *      when both stream paths are unavailable (table not configured,
 *      MediaMTX down, no live publisher).
 *
 * The component is intentionally dumb about table state — it just
 * renders whatever stream URLs it's given. The `/play` page reads
 * those URLs from `/internal/tables/{id}/state` and passes them in.
 *
 * Reconnection: any failure that lands us in fallback (publisher not
 * started yet, MediaMTX restart, network blip) schedules a silent
 * retry of the whole WHEP → HLS sequence, so the video recovers on
 * its own when the stream comes back — no page refresh needed.
 */
interface VideoPlayerProps {
  webrtcUrl: string | null;
  hlsUrl: string | null;
  fallback: ReactNode;
}

type PlaybackState = "connecting" | "playing" | "fallback" | "error";

const VOLUME_STORAGE_KEY = "prg_player_volume";
const MUTED_STORAGE_KEY = "prg_player_muted";

/** How long to wait before re-attempting a failed/ended stream connection. */
const RECONNECT_DELAY_MS = 6000;

/** Read persisted audio preferences (volume 0-1, muted bool). */
function loadAudioPrefs(): { volume: number; muted: boolean } {
  if (typeof window === "undefined") return { volume: 1, muted: true };
  const v = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
  const m = window.localStorage.getItem(MUTED_STORAGE_KEY);
  return {
    volume: Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1,
    // Default muted until the player explicitly unmutes — browser autoplay
    // policy rejects unmuted autoplay without a user gesture, and we don't
    // want a startup audio blast surprising the dealer's headset feedback.
    muted: m === null ? true : m === "true",
  };
}

export default function VideoPlayer({ webrtcUrl, hlsUrl, fallback }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<PlaybackState>("connecting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1);
  const [showVolume, setShowVolume] = useState(false);
  // Bumped to re-run the connection effect after a failure. Monotonic —
  // every retry tears down the previous attempt via the effect cleanup.
  const [attempt, setAttempt] = useState(0);

  // Hydrate persisted prefs on first mount only — re-running on every render
  // would clobber user changes.
  useEffect(() => {
    const prefs = loadAudioPrefs();
    setMuted(prefs.muted);
    setVolume(prefs.volume);
  }, []);

  // Push state changes onto the underlying <video>. Separate effect from the
  // stream connection so toggling mute doesn't re-negotiate WebRTC.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.volume = volume;
  }, [muted, volume]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTED_STORAGE_KEY, String(next));
    }
    // Unmuting in response to a click counts as a user gesture, so play()
    // will succeed even if the stream was previously muted-autoplay.
    if (!next) videoRef.current?.play().catch(() => undefined);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    }
    // Moving the slider from 0 implies the player wants audio — auto-unmute.
    if (v > 0 && muted) {
      setMuted(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MUTED_STORAGE_KEY, "false");
      }
    }
  };

  useEffect(() => {
    if (!webrtcUrl && !hlsUrl) {
      setState("fallback");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let hls: Hls | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // Schedule a fresh connection attempt after a failure. Idempotent per
    // effect run — only one timer is ever pending, and cleanup cancels it.
    const scheduleRetry = () => {
      if (cancelled || retryTimer) return;
      retryTimer = setTimeout(() => setAttempt((a) => a + 1), RECONNECT_DELAY_MS);
    };

    // Track ALL cleanup so a fast unmount during async negotiation
    // doesn't leak peer connections or HLS workers.
    const cleanup = () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (pc) {
        pc.getSenders().forEach((s) => s.track?.stop());
        pc.close();
        pc = null;
      }
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
      video.removeAttribute("src");
      video.load();
    };

    /**
     * WHEP handshake — minimal spec implementation. POST a local SDP
     * offer, get the remote answer back in the response body. MediaMTX
     * doesn't require auth on read so no headers beyond Content-Type.
     */
    const tryWebRTC = async (): Promise<boolean> => {
      if (!webrtcUrl) return false;
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        // We want a receive-only viewer connection.
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        const remoteStream = new MediaStream();
        pc.ontrack = (ev) => {
          ev.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
          if (video.srcObject !== remoteStream) {
            video.srcObject = remoteStream;
          }
        };
        pc.onconnectionstatechange = () => {
          if (cancelled || !pc) return;
          if (pc.connectionState === "connected") setState("playing");
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            // Don't immediately fall back; the WebRTC stack will retry
            // ICE on its own. If it stays failed for 5s, we fall back.
            setTimeout(() => {
              if (
                pc &&
                (pc.connectionState === "failed" || pc.connectionState === "disconnected")
              ) {
                tryHls();
              }
            }, 5000);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await fetch(webrtcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
        if (!res.ok) {
          throw new Error(`WHEP POST ${res.status}`);
        }
        const answerSdp = await res.text();
        if (cancelled || !pc) return false;
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        // Don't flip to playing yet — wait for connectionstate.
        // play() throws if the user hasn't interacted, but it's
        // muted-by-default below so autoplay policy is satisfied.
        try {
          await video.play();
        } catch {
          // First play may be rejected; user gesture will recover.
        }
        return true;
      } catch (err) {
        console.warn("[VideoPlayer] WebRTC failed:", err);
        return false;
      }
    };

    /**
     * HLS fallback — Safari plays HLS natively via the `src` attribute;
     * every other browser needs hls.js for MSE-based playback.
     */
    const tryHls = async (): Promise<void> => {
      if (cancelled) return;
      if (pc) {
        pc.close();
        pc = null;
      }
      if (!hlsUrl) {
        setState("fallback");
        scheduleRetry();
        return;
      }
      // Native HLS (Safari).
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.addEventListener("loadeddata", () => !cancelled && setState("playing"), { once: true });
        video.addEventListener(
          "error",
          () => {
            if (cancelled) return;
            setErrorMsg("HLS stream unavailable");
            setState("fallback");
            scheduleRetry();
          },
          { once: true },
        );
        try {
          await video.play();
        } catch {
          // ignored — muted autoplay should succeed regardless
        }
        return;
      }
      // hls.js path (Chrome, Firefox, etc.).
      if (Hls.isSupported()) {
        hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 10,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          video.play().catch(() => undefined);
        });
        hls.on(Hls.Events.LEVEL_LOADED, () => !cancelled && setState("playing"));
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (cancelled) return;
          if (data.fatal) {
            setErrorMsg(`HLS error: ${data.details}`);
            setState("fallback");
            scheduleRetry();
          }
        });
        return;
      }
      setState("fallback");
      // No MSE support, but WHEP may still recover on a later attempt.
      if (webrtcUrl) scheduleRetry();
    };

    // Keep showing the current frame (or fallback) while reconnecting —
    // only show "Connecting…" on the first attempt so retries are silent.
    if (attempt === 0) setState("connecting");
    void (async () => {
      const wrtcOk = await tryWebRTC();
      if (!wrtcOk && !cancelled) {
        await tryHls();
      }
    })();

    return cleanup;
  }, [webrtcUrl, hlsUrl, attempt]);

  // Always render the <video> element so videoRef stays bound. Stream URLs
  // arrive async (DemoWrapper / useStateRecovery fetch), so if we conditionally
  // unmount the video tag while waiting, the next useEffect tick fires with
  // videoRef.current === null and the WHEP/HLS handshake silently never runs.
  // Instead, keep the video mounted and overlay the fallback when needed.
  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <video
        ref={videoRef}
        playsInline
        autoPlay
        // Initial muted attr satisfies autoplay policy; the muted state
        // controlled effect above takes over once the user touches the
        // volume controls.
        muted
        className="w-full h-full object-cover"
        style={{ display: state === "fallback" ? "none" : "block" }}
      />
      {state === "fallback" && (
        <div className="absolute inset-0">{fallback}</div>
      )}

      {/* Audio controls — only shown when actually playing the stream */}
      {(state === "playing" || state === "connecting") && (
        <div
          className="absolute z-10"
          style={{ bottom: 12, right: 12, display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          {showVolume && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              style={{
                width: 80,
                accentColor: "#f0b100",
                cursor: "pointer",
              }}
            />
          )}
          <button
            onClick={handleToggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            {muted || volume === 0 ? (
              // Muted icon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              // Speaker icon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      )}

      {state === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            Connecting to live stream…
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-red-300 bg-black/60 rounded px-2 py-1">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
