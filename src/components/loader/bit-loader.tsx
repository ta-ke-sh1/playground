import type { CSSProperties } from "react";

import "./bit-loader.css";

// Perimeter cells of a 3x3 grid in clockwise order, as [column, row].
const RING: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 2],
  [3, 3],
  [2, 3],
  [1, 3],
  [1, 2],
];

export function BitLoader({ label = "Loading page" }: { label?: string }) {
  return (
    <div className="bit-loader" role="status" aria-label={label}>
      {RING.map(([col, row], index) => (
        <span
          key={index}
          className="bit-loader__bit"
          style={
            {
              gridColumn: col,
              gridRow: row,
              "--bit-index": index,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default BitLoader;
