"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, RotateCcw, X } from "lucide-react";
import styles from "./WebcamCapture.module.css";

function cameraError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError")
      return "Camera access was blocked. Allow it in your browser and try again, or upload a photo instead.";
    if (error.name === "NotFoundError")
      return "No camera was found. Connect a camera or upload a photo instead.";
    if (error.name === "NotReadableError")
      return "The camera is busy or unavailable. Close other camera apps and try again, or upload a photo instead.";
    if (error.name === "CameraUnavailable") return error.message;
  }
  return "The camera could not open. Try again or upload a photo instead.";
}

function CameraDialog({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "opening" | "ready" | "capturing" | "review" | "error"
  >("opening");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    const modal = dialog.current;
    mounted.current = true;
    modal?.showModal();
    return () => {
      mounted.current = false;
      modal?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ownedStream: MediaStream | null = null;
    const preview = video.current;

    async function openCamera() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        const unavailable = new Error(
          "Camera capture needs a supported browser on HTTPS or localhost. You can still upload a photo.",
        );
        unavailable.name = "CameraUnavailable";
        throw unavailable;
      }
      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
      });
      if (cancelled || !preview) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      ownedStream = camera;
      stream.current = camera;
      preview.srcObject = camera;
      await preview.play();
      if (!cancelled) setStatus("ready");
    }

    void openCamera().catch((reason: unknown) => {
      if (cancelled) return;
      ownedStream?.getTracks().forEach((track) => track.stop());
      if (stream.current === ownedStream) stream.current = null;
      setError(cameraError(reason));
      setStatus("error");
    });

    return () => {
      cancelled = true;
      ownedStream?.getTracks().forEach((track) => track.stop());
      if (stream.current === ownedStream) {
        stream.current = null;
        if (preview) preview.srcObject = null;
      }
    };
  }, [attempt]);

  async function capture() {
    const preview = video.current;
    const frame = canvas.current;
    if (!preview || !frame || !preview.videoWidth || preview.readyState < 2) {
      setError("The camera is still warming up. Try taking the photo again.");
      return;
    }
    const context = frame.getContext("2d");
    if (!context) {
      setError(
        "This browser could not capture the photo. Try uploading instead.",
      );
      return;
    }
    setStatus("capturing");
    setError("");
    const scale = Math.min(
      1,
      1600 / Math.max(preview.videoWidth, preview.videoHeight),
    );
    frame.width = Math.max(1, Math.round(preview.videoWidth * scale));
    frame.height = Math.max(1, Math.round(preview.videoHeight * scale));
    try {
      context.drawImage(preview, 0, 0, frame.width, frame.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        frame.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!mounted.current) return;
      if (!blob) throw new Error("Empty camera capture");
      setPhoto(
        new File([blob], `camera-item-${Date.now()}.jpg`, {
          type: blob.type,
        }),
      );
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      preview.srcObject = null;
      setStatus("review");
    } catch {
      if (!mounted.current) return;
      setError("The photo could not be captured. Please try again.");
      setStatus("ready");
    }
  }

  function retry() {
    setPhoto(null);
    setError("");
    setStatus("opening");
    setAttempt((value) => value + 1);
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="camera-title"
      aria-describedby="camera-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.heading}>
        <h2 id="camera-title">
          {photo ? "How does it look?" : "Take a photo"}
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close camera"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <p id="camera-description" className={styles.description}>
        {photo
          ? "Use this photo to add the item to your packing inventory, or retake it."
          : "Show your item clearly in good light, then take a photo."}
      </p>
      <video
        ref={video}
        className={styles.media}
        autoPlay
        playsInline
        muted
        hidden={!!photo || status === "error"}
        aria-label="Live camera preview"
      />
      <canvas
        ref={canvas}
        className={styles.media}
        hidden={!photo}
        role="img"
        aria-label="Captured photo of your item"
      />
      <p className={styles.status} role="status">
        {status === "opening" && (
          <>
            <LoaderCircle size={15} className="spin" /> Opening your camera…
            Allow camera access when asked.
          </>
        )}
        {status === "capturing" && "Capturing your photo…"}
        {status === "review" && "Camera off. Your photo is ready to review."}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        {status === "error" ? (
          <button type="button" className="primary-button" onClick={retry}>
            Try camera again
          </button>
        ) : photo ? (
          <>
            <button type="button" className="text-button" onClick={retry}>
              <RotateCcw size={15} /> Retake
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => onCapture(photo)}
            >
              Use photo
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primary-button"
            disabled={status !== "ready"}
            onClick={() => void capture()}
          >
            <Camera size={16} /> Take photo
          </button>
        )}
      </div>
    </dialog>
  );
}

export default function WebcamCapture({
  disabled,
  onCapture,
}: {
  disabled: boolean;
  onCapture: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.launch}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Camera size={16} /> Take a photo
      </button>
      {open && (
        <CameraDialog
          onClose={() => setOpen(false)}
          onCapture={(file) => {
            setOpen(false);
            onCapture(file);
          }}
        />
      )}
    </>
  );
}
