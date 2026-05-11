'use client';
import React from 'react';
import { Group, Circle, Line } from 'react-konva';
import type { BallObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  object: BallObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export const BallRenderer = React.memo(function BallRenderer({ object, isSelected, isHovered, onSelect, onDragEnd }: Props) {
  const activeTool = useEditorStore(s => s.activeTool);
  const r = object.size / 2;

  return (
    <Group
      x={object.x} y={object.y}
      opacity={object.visible ? object.opacity : 0}
      draggable={activeTool === 'select' && !object.locked}
      listening={activeTool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(object.id, e.evt.shiftKey); }}
      onDragEnd={(e) => onDragEnd(object.id, e.target.x(), e.target.y())}
    >
      <Circle
        radius={r}
        fill="#F5F5DC"
        stroke={isSelected ? '#63C0B0' : '#222222'}
        strokeWidth={isSelected ? 2.5 : 1.5}
        shadowEnabled={isSelected}
        shadowColor="#63C0B0" shadowBlur={8} shadowOpacity={0.6}
      />
      {/* Pentagon-style markings */}
      <Line points={[0, -r*0.5, r*0.45, r*0.15, r*0.28, r*0.6, -r*0.28, r*0.6, -r*0.45, r*0.15]}
        closed fill="#222222" stroke="#222222" strokeWidth={0.5} listening={false} />
    </Group>
  );
});
