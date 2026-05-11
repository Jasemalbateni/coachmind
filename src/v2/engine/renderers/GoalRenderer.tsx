'use client';
import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import type { GoalObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  object: GoalObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export const GoalRenderer = React.memo(function GoalRenderer({ object, isSelected, isHovered, onSelect, onDragEnd }: Props) {
  const activeTool = useEditorStore(s => s.activeTool);
  const { imgW: w, imgH: h } = object;
  return (
    <Group
      x={object.x} y={object.y}
      offsetX={w/2} offsetY={h/2}
      rotation={object.rotation}
      scaleX={object.flipped ? -1 : 1}
      opacity={object.visible ? object.opacity : 0}
      draggable={activeTool === 'select' && !object.locked}
      listening={activeTool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onSelect(object.id, e.evt.shiftKey); }}
      onDragEnd={(e) => onDragEnd(object.id, e.target.x(), e.target.y())}
    >
      <Rect width={w} height={h} fill="rgba(255,255,255,0.1)"
        stroke={isSelected ? '#63C0B0' : '#FFFFFF'} strokeWidth={isSelected ? 3 : 2} />
      {[1,2,3,4].map(i => (
        <Line key={`h${i}`} points={[0, h/5*i, w, h/5*i]} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} listening={false} />
      ))}
      {[1,2,3,4,5,6].map(i => (
        <Line key={`v${i}`} points={[w/7*i, 0, w/7*i, h]} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} listening={false} />
      ))}
    </Group>
  );
});
