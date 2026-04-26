"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { uploadProof, type ProofMedia } from "@/lib/portal-client";

export function CameraCapture({ onUploaded }: { onUploaded: (media: ProofMedia) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string>("Location is required before proof upload.");
  const [uploading, setUploading] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lon: number;
    accuracyM: number;
    capturedAt: string;
  } | null>(null);

  async function captureLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15_000,
      });
    });
  }

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    if (!pendingLocation) {
      setMessage("Please capture location before selecting a proof photo.");
      return;
    }
    setUploading(true);
    try {
      const media = await uploadProof({
        file,
        location_lat: pendingLocation.lat,
        location_lon: pendingLocation.lon,
        location_accuracy_m: pendingLocation.accuracyM,
        location_captured_at: pendingLocation.capturedAt,
      });
      onUploaded(media);
      setMessage(`Proof uploaded with GPS accuracy ${Math.round(pendingLocation.accuracyM)}m.`);
      setPendingLocation(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Proof upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function openCameraAfterLocation() {
    setUploading(true);
    setMessage("Requesting precise location...");
    try {
      const position = await captureLocation();
      setPendingLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        capturedAt: new Date().toISOString(),
      });
      setMessage(
        `Location captured (${Math.round(position.coords.accuracy)}m accuracy). Now take the proof photo.`,
      );
      inputRef.current?.click();
    } catch {
      setMessage(
        "Location permission is required to verify this photo was taken at your facility. Please enable location access in your browser settings.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-default p-4">
      <p className="text-sm text-text-secondary">
        Clinical, equipment, and capability updates require a location-tagged photo.
      </p>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => onFileSelected(event.target.files?.[0])}
      />
      <Button type="button" onClick={openCameraAfterLocation} disabled={uploading}>
        {uploading ? "Working..." : "Capture location and proof photo"}
      </Button>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
