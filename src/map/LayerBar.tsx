import type { MapLayers } from "../types";

const ITEMS: { key: keyof MapLayers; label: string }[] = [
  { key: "ponds", label: "Chuồng" },
  { key: "farms", label: "Trại" },
  { key: "routes", label: "Xe / tuyến" },
  { key: "plants", label: "Điểm thu" },
];

type Props = {
  layers: MapLayers;
  onToggle: (key: keyof MapLayers) => void;
};

export function LayerBar({ layers, onToggle }: Props) {
  return (
    <aside className="layer-bar" aria-label="Lớp bản đồ">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={layers[item.key] ? "on" : ""}
          aria-pressed={layers[item.key]}
          onClick={() => onToggle(item.key)}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}
