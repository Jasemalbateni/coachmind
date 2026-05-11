'use client';
import React from 'react';
import { RegularPolygon } from 'react-konva';
import type { ConeObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';

const CONE_COLORS: Record<string, string> = {
  'cone': '#FF6B35', 'blue-cone': '#2176AE', 'red-cone': '#E63946',
  'green-cone': '#2DC653', 'yellow-cone': '#FFD60A',
};

interface Props {
  object: ConeObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export const ConeRenderer = React.memo(function ConeRenderer({ object, isSelected, isHovered, onSelect, onDragEnd }: Props) {
  const activeTool = useEditorStore(s => s.activeTool);
  const fill = CONE_COLORS[object.variant] ?? '#FF6B35';
  return (
    <RegularPolygon
      x={object.x} y={object.y}
      sides={3} radius={object.size / 2}
      fill={fill}
      stroke={isSelected ? '#63C0B0' : 'rgba(0,0,0,0.3)'}
      strokeWidth={isSelected ? 2.5 : 1}
      rotation={180}
      opacity={object.visible ? object.opacity : 0}
      draggable={activeTool === 'select' && !object.locked}
      listening={activeTool === 'select'}
      shadowEnabled={isSelected}
      shadowColor="#63C0B0" shadowBlur={6} shadowOpacity={0.5}
      onClick={(e) => { e.cancelBubble = true; onSelect(object.id, e.evt.shiftKey); }}
      onDragEnd={(e) => onDragEnd(object.id, e.target.x(), e.target.y())}
    />
  );
});
