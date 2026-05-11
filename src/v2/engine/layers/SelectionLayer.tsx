'use client';
import { Layer, Transformer, Rect } from 'react-konva';
import { useRef, useEffect } from 'react';
import type Konva from 'konva';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  stageRef: React.RefObject<Konva.Stage>;
  marquee: { x: number; y: number; width: number; height: number } | null;
}

export function SelectionLayer({ stageRef, marquee }: Props) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedIds = useEditorStore(s => s.selectedIds);

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const nodes = selectedIds
      .map(id => stageRef.current!.findOne(`#konva-${id}`))
      .filter(Boolean) as Konva.Node[];
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, stageRef]);

  return (
    <Layer>
      <Transformer ref={transformerRef}
        borderStroke="#63C0B0" borderStrokeWidth={1.5}
        anchorStroke="#63C0B0" anchorFill="#FFFFFF" anchorSize={8} anchorCornerRadius={2}
        rotationSnaps={[0,45,90,135,180,225,270,315]}
        keepRatio={false} ignoreStroke />
      {marquee && (
        <Rect x={marquee.x} y={marquee.y} width={marquee.width} height={marquee.height}
          fill="rgba(99,192,176,0.07)" stroke="#63C0B0" strokeWidth={1} dash={[4,4]} listening={false} />
      )}
    </Layer>
  );
}
