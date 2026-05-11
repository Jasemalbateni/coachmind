'use client';
import { Layer, Circle, Arrow, Rect } from 'react-konva';
import { useEditorStore } from '../../store/editorStore';

export function GhostLayer() {
  const ghost = useEditorStore(s => s.ghostPreview);
  if (!ghost) return <Layer listening={false} />;
  return (
    <Layer listening={false} opacity={0.45}>
      {ghost.kind === 'point' && (
        <Circle x={ghost.x} y={ghost.y} radius={18} fill="#63C0B0" stroke="#FFFFFF" strokeWidth={2} />
      )}
      {ghost.kind === 'line' && (
        <Arrow points={[ghost.startX, ghost.startY, ghost.endX, ghost.endY]}
          stroke="#FFFFFF" fill="#FFFFFF" strokeWidth={2} pointerLength={10} pointerWidth={8} />
      )}
      {ghost.kind === 'area' && (
        <Rect x={ghost.x} y={ghost.y} width={ghost.width} height={ghost.height}
          fill="rgba(99,192,176,0.15)" stroke="#63C0B0" strokeWidth={1.5} dash={[6,4]} />
      )}
    </Layer>
  );
}
