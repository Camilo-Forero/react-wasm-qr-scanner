import { useEffect, useRef, CSSProperties } from "react";
import { readBarcodesFromImageData } from "zxing-wasm";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface WasmQrScannerProps {
  onDataRead: (qrValue: string) => void;
  selectedDeviceId?: string;
  selectCam?: "back" | "front";
  scanIntervalMs?: number;
  scan?: "once" | "flow";

  // Container styling
  containerClassName?: string;
  containerCssStyle?: CSSProperties;

  // Video element styling
  videoClassName?: string;
  videoCssStyle?: CSSProperties;

  // Target shutter box styling
  shutterClassName?: string;
  shutterCssStyle?: CSSProperties;
}

/**
 * Standalone utility function to enumerate available camera devices.
 */
export async function getCameras(): Promise<CameraDevice[]> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasLabels = devices.some((d) => d.kind === "videoinput" && d.label);

    if (!hasLabels) {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((t) => t.stop());
    }

    const updatedDevices = await navigator.mediaDevices.enumerateDevices();
    return updatedDevices
      .filter((d) => d.kind === "videoinput")
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
      }));
  } catch (err) {
    console.error("Failed to enumerate camera devices:", err);
    return [];
  }
}

/**
 * High-performance React QR scanner component powered by zxing-wasm.
 */
export function WasmQrScanner({
  onDataRead,
  selectedDeviceId,
  selectCam,
  scanIntervalMs = 100,
  scan = "once",
  containerClassName,
  containerCssStyle,
  videoClassName,
  videoCssStyle,
  shutterClassName,
  shutterCssStyle,
}: WasmQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const stopCurrentStream = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  };

  const attachStreamToVideo = (stream: MediaStream): Promise<void> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) return resolve();

      video.pause();
      video.srcObject = stream;
      video.load();

      const handleCanPlay = async () => {
        video.removeEventListener("loadedmetadata", handleCanPlay);
        try {
          await video.play();
        } catch (e) {
          console.warn("Play error:", e);
        }
        resolve();
      };

      video.addEventListener("loadedmetadata", handleCanPlay);
    });
  };

  // 1. Camera Initialization & Selection
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      stopCurrentStream();

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      const constraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

      if (selectedDeviceId) {
        constraints.deviceId = { exact: selectedDeviceId };
      } else if (selectCam) {
        constraints.facingMode = selectCam === "back" ? { ideal: "environment" } : { ideal: "user" };
      } else {
        constraints.facingMode = { ideal: "environment" };
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        } catch (_) {
          const fallbackConstraint = selectCam === "front" ? "user" : "environment";
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode: fallbackConstraint },
          });
        }

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStreamRef.current = stream;
        await attachStreamToVideo(stream);
      } catch (err) {
        console.error("Camera streaming failed:", err);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCurrentStream();
    };
  }, [selectedDeviceId, selectCam]);

  // 2. WASM Automated Frame Reader Loop
  useEffect(() => {
    let activeScanning = true;
    let isProcessingFrame = false;

    const scanLoop = async () => {
      if (!activeScanning) return;

      const video = videoRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingFrame) {
        isProcessingFrame = true;

        try {
          const canvas = canvasRef.current || document.createElement("canvas");
          canvasRef.current = canvas;

          const width = video.videoWidth;
          const height = video.videoHeight;

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx && width > 0 && height > 0) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            const results = await readBarcodesFromImageData(imageData, {
              formats: ["QRCode"],
              tryHarder: true,
            });

            if (results.length > 0 && results[0].text) {
              onDataRead(results[0].text);

              // Stop scanning if mode is set to "once"
              if (scan === "once") {
                activeScanning = false;
                return;
              }
            }
          }
        } catch (_) {
          // Catch frame execution drops
        } finally {
          isProcessingFrame = false;
        }
      }

      if (activeScanning) {
        setTimeout(scanLoop, scanIntervalMs);
      }
    };

    scanLoop();

    return () => {
      activeScanning = false;
    };
  }, [onDataRead, scanIntervalMs, scan]);

  // Default Fallback Styles
  const defaultContainerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: "none",
    overflow: "hidden",
  };

  const defaultVideoStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  };

  const defaultShutterStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    maxWidth: "200px",
    aspectRatio: "1 / 1",
    border: "2px solid red",
    borderRadius: "12px",
    boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.4)",
    pointerEvents: "none",
  };

  return (
    <div
      className={containerClassName}
      style={{ ...defaultContainerStyle, ...containerCssStyle }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={videoClassName}
        style={{ ...defaultVideoStyle, ...videoCssStyle }}
      />
      <div
        className={shutterClassName}
        style={{ ...defaultShutterStyle, ...shutterCssStyle }}
      />
    </div>
  );
}
