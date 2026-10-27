import type { Asset } from "../types";

type Props = {
  cameras: Asset[];
  onOpen: (cameraId: string) => void;
};

function lostFeed(item: Asset): boolean {
  return item.status === "offline" || item.status === "fault";
}

export function CameraBubbles({ cameras, onOpen }: Props) {
  if (!cameras.length) return null;
  return (
    <div className="cam-bubbles">
      {cameras.map((item) => {
        const lost = lostFeed(item);
        return (
          <button
            key={item.id}
            type="button"
            className={lost ? "lost" : ""}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item.id);
            }}
          >
            {item.name}
            {lost ? <em>Mất</em> : null}
          </button>
        );
      })}
    </div>
  );
}

export function pondCameras(assets: Asset[]): Asset[] {
  return assets.filter((item) => item.kind === "camera");
}
