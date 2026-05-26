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
 */
interface VideoPlayerProps {
  webrtcUrl: string | null;
  hlsUrl: string | null;
  fallback: ReactNode;
}

type PlaybackState = "connecting" | "playing" | "fallback" | "error";

export default function VideoPlayer({ webrtcUrl, hlsUrl, fallback }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<PlaybackState>("connecting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    // Track ALL cleanup so a fast unmount during async negotiation
    // doesn't leak peer connections or HLS workers.
    const cleanup = () => {
      cancelled = true;
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
          }
        });
        return;
      }
      setState("fallback");
    };

    setState("connecting");
    void (async () => {
      const wrtcOk = await tryWebRTC();
      if (!wrtcOk && !cancelled) {
        await tryHls();
      }
    })();

    return cleanup;
  }, [webrtcUrl, hlsUrl]);

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
        muted
        autoPlay
        className="w-full h-full object-cover"
        style={{ display: state === "fallback" ? "none" : "block" }}
      />
      {state === "fallback" && (
        <div className="absolute inset-0">{fallback}</div>
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
