import { useEffect, useState } from "react";
import { assetStatusLabel, pondImage } from "../geo";
import type { Asset, PondPin } from "../types";

type Props = {
  pin: PondPin;
  ponds: PondPin[];
  cameraId: string;
  onSelectPond: (pondId: string) => void;
  onSelectCamera: (cameraId: string) => void;
  onClose: () => void;
};

function lostFeed(item: Asset | undefined): boolean {
  return item?.status === "offline" || item?.status === "fault";
}

function cameraFrame(item: Asset | undefined, total: number): { backgroundPosition: string; backgroundSize: string } {
  if (!item || total <= 1) return { backgroundPosition: "center", backgroundSize: "cover" };
  const place = `${item.location_label} ${item.name}`.toLowerCase();
  if (place.includes("tây")) return { backgroundPosition: "0% 62%", backgroundSize: "280% 280%" };
  if (place.includes("đông")) return { backgroundPosition: "100% 28%", backgroundSize: "280% 280%" };
  if (place.includes("nam")) return { backgroundPosition: "42% 100%", backgroundSize: "250% 250%" };
  if (place.includes("bắc")) return { backgroundPosition: "58% 0%", backgroundSize: "250% 250%" };
  if (place.includes("cổng")) return { backgroundPosition: "8% 100%", backgroundSize: "300% 300%" };
  return { backgroundPosition: "center", backgroundSize: "220% 220%" };
}

export function CameraModal({ pin, ponds, cameraId, onSelectPond, onSelectCamera, onClose }: Props) {
  const cameras = pin.assets.filter((item) => item.kind === "camera");
  const [now, setNow] = useState(() => new Date());
  const active = cameras.find((item) => item.id === cameraId) ?? cameras[0];
  const lost = lostFeed(active);
  const frame = cameraFrame(active, cameras.length);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const stamp = now.toLocaleString("vi-VN", { hour12: false });
  const image = pondImage(pin.pond.pond_code);

  return (
    <div className="camera-overlay" onClick={onClose} role="presentation">
      <div
        className="camera-modal"
        role="dialog"
        aria-label={`Camera ${pin.pond.pond_name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="camera-bar">
          <span className={`camera-rec${lost ? " off" : ""}`}>{lost ? "MẤT HÌNH" : "REC"}</span>
          <div>
            <b>{pin.pond.pond_name}</b>
            {active ? (
              <small>
                {active.name} · {active.location_label} · {assetStatusLabel(active.status)}
              </small>
            ) : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng camera">
            ×
          </button>
        </header>
        {ponds.length > 1 || cameras.length > 1 ? (
          <div className="camera-switch">
            {ponds.length > 1 ? (
              <div className="camera-ponds">
                <span>Chuồng</span>
                <div role="tablist" aria-label="Chuồng trong trại">
                  {ponds.map((item) => (
                    <button
                      key={item.pond.id}
                      type="button"
                      role="tab"
                      aria-selected={item.pond.id === pin.pond.id}
                      className={item.pond.id === pin.pond.id ? "on" : ""}
                      onClick={() => onSelectPond(item.pond.id)}
                    >
                      {item.pond.pond_name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {cameras.length > 1 ? (
              <div className="camera-tabs">
                <span>Camera</span>
                <div role="tablist" aria-label="Camera trong chuồng">
                  {cameras.map((item) => {
                    const itemLost = lostFeed(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={item.id === active?.id}
                        className={`${item.id === active?.id ? "on" : ""}${itemLost ? " lost" : ""}`}
                        onClick={() => onSelectCamera(item.id)}
                      >
                        {item.name}
                        {itemLost ? <em>Mất</em> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={`camera-feed${lost ? " lost" : ""}`}
          style={
            lost
              ? undefined
              : { backgroundImage: `url(${image})`, backgroundPosition: frame.backgroundPosition, backgroundSize: frame.backgroundSize }
          }
        >
          {lost ? <b>Mất hình</b> : <span className="camera-scan" />}
          <span className="camera-stamp">{stamp}</span>
        </div>
      </div>
    </div>
  );
}
