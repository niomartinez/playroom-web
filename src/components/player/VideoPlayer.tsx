"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Hls from "hls.js";
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
    let stallTimer: ReturnType<typeof setInterval> | null = null;

    const stopStallWatchdog = () => {
      if (stallTimer) {
        clearInterval(stallTimer);
        stallTimer = null;
      }
    };

    /**
     * WebRTC can report "connected" while zero media flows — e.g. a
     * privacy extension blocking UDP after the handshake, or a zombie
     * publisher holding the path with no frames. The player then shows
     * black forever with no error to react to. Watch decoded-frame
     * progress; if it stalls for 3 checks (~9s), drop to HLS (TCP),
     * which survives UDP blocking — and from there the normal
     * fallback/retry chain takes over.
     */
    const startStallWatchdog = () => {
      if (stallTimer) return;
      let lastFrames = -1;
      let stalledChecks = 0;
      stallTimer = setInterval(() => {
        if (cancelled || !pc) return;
        // Read framesDecoded from WebRTC stats, NOT from
        // video.getVideoPlaybackQuality(): WebKit/iOS never advances the
        // playback-quality counters for MediaStream sources, which made
        // this watchdog kill healthy connections on iPhone every ~9s.
        void pc
          .getStats()
          .then((stats) => {
            if (cancelled || !pc || !stallTimer) return;
            let frames = -1;
            stats.forEach((report) => {
              const r = report as { type?: string; kind?: string; framesDecoded?: number };
              if (r.type === "inbound-rtp" && r.kind === "video" && typeof r.framesDecoded === "number") {
                frames = r.framesDecoded;
              }
            });
            if (frames < 0) return; // stat unavailable — never false-positive
            if (frames === lastFrames) {
              stalledChecks++;
              if (stalledChecks >= 3) {
                console.warn(
                  "[VideoPlayer] WebRTC connected but no frames decoding — falling back to HLS",
                );
                stopStallWatchdog();
                void tryHls();
              }
            } else {
              stalledChecks = 0;
              lastFrames = frames;
            }
          })
          .catch(() => undefined);
      }, 3000);
    };

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
      stopStallWatchdog();
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
          if (pc.connectionState === "connected") {
            setState("playing");
            setErrorMsg(null);
            startStallWatchdog();
          }
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
      stopStallWatchdog();
      if (pc) {
        pc.close();
        pc = null;
      }
      // Detach any WebRTC MediaStream before attaching HLS: srcObject
      // takes precedence over src per spec, so a dead stream left here
      // makes the HLS fallback render permanent black with no errors.
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
      if (!hlsUrl) {
        setState("fallback");
        scheduleRetry();
        return;
      }
      // Native HLS (Safari).
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.addEventListener(
          "loadeddata",
          () => {
            if (cancelled) return;
            setState("playing");
            setErrorMsg(null);
          },
          { once: true },
        );
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
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          if (cancelled) return;
          setState("playing");
          setErrorMsg(null);
        });
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
    // only show "Connecting…" on the first attempt; retries show the
    // smaller "Reconnecting…" pill driven by `attempt` instead.
    if (attempt === 0) setState("connecting");
    setErrorMsg(null);
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
    <div
      className="absolute inset-0 w-full h-full overflow-hidden"
      // overflow-hidden clips the scaled-up backdrop below; solid black is
      // the ultimate fallback color behind everything.
      style={{ backgroundColor: "#000" }}
    >
      {/* Branded felt backdrop — its OWN layer so the blur + scrim never
          touch the video or the controls. It's blurred and slightly scaled
          up (scale hides the blur's soft transparent edge that would
          otherwise reveal the black container border) with a translucent
          dark scrim on top, so the felt reads as an out-of-focus background
          behind the live feed rather than a competing foreground. A full
          backdrop-filter "glass" panel would be pointless here — the felt is
          static, so pre-blurring the image is the same look far cheaper. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          zIndex: 0,
          backgroundColor: "#000",
          backgroundImage:
            "linear-gradient(rgba(3,7,18,0.4), rgba(3,7,18,0.4)), url(/stream-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(4px)",
          transform: "scale(1.06)",
        }}
      />
      <video
        ref={videoRef}
        playsInline
        autoPlay
        // Initial muted attr satisfies autoplay policy; the muted state
        // controlled effect above takes over once the user touches the
        // volume controls.
        muted
        // object-contain: never crop the dealer feed — the full 1080p frame
        // is always visible, letter/pillarboxed over the felt backdrop. The
        // drop-shadow traces the transparent letterbox, so it hugs the actual
        // video frame (not the element box) at any aspect ratio, making the
        // feed look like it floats above the background.
        className="relative w-full h-full object-contain"
        style={{
          zIndex: 1,
          display: state === "fallback" ? "none" : "block",
          filter:
            "drop-shadow(0 2px 10px rgba(0,0,0,0.55)) drop-shadow(0 12px 32px rgba(0,0,0,0.45))",
        }}
      />
      {state === "fallback" && (
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {fallback}
        </div>
      )}

      {/* Audio controls — only shown when actually playing the stream.
          Bottom-LEFT: the chat panel docks to the right edge (z-20) and
          covers anything placed bottom-right when expanded. */}
      {(state === "playing" || state === "connecting") && (
        <div
          className="absolute z-10"
          style={{ bottom: 12, left: 12, display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <button
            onClick={handleToggleMute}
            aria-label={muted ? t("video.unmute") : t("video.mute")}
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
          {showVolume && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label={t("video.volume")}
              style={{
                width: 80,
                accentColor: "#f0b100",
                cursor: "pointer",
              }}
            />
          )}
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
            {t("video.connecting")}
          </div>
        </div>
      )}

      {/* Retry indicator — shown while the auto-reconnect loop is trying
          to recover a dropped/not-yet-started stream. Top-anchored: the
          DealVisualizer fallback owns the center with its WAITING banner. */}
      {attempt > 0 && state !== "playing" && state !== "connecting" && (
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            <span
              aria-hidden
              className="animate-spin"
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#f0b100",
              }}
            />
            {t("video.reconnecting")}
          </div>
        </div>
      )}

      {errorMsg && state !== "playing" && (
        <div className="absolute top-2 left-2 inline-block max-w-[60%] text-[10px] text-red-300 bg-black/60 rounded px-2 py-1 pointer-events-none">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
