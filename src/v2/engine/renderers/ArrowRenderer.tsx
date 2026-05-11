'use client';
import React from 'react';
import { Arrow, Line, Path } from 'react-konva';
import type { ArrowObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import { getZigzagPoints } from '../utils/arrowPoints';
import type Konva from 'konva';

const TACTIC_COLORS: Record<string, string> = {
  pass: '#FFFFFF', run: '#63C0B0', dribble: '#FFC857',
  press: '#E63946', support: '#8DD3C7', lane: 'rgba(255,255,255,0.4)', defline: '#E63946',
};

interface Props {
  object: ArrowObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
}

export const ArrowRenderer = React.memo(function ArrowRenderer({ object, isSelected, isHovered, onSelect }: Props) {
  const activeTool = useEditorStore(s => s.activeTool);
  const color = object.tacticType ? (TACTIC_COLORS[object.tacticType] ?? object.color) : object.color;
  const sw = object.strokeWidth * (isSelected ? 1.5 : 1);
  const dash = object.lineStyle === 'dashed' ? [12, 6] : object.lineStyle === 'dotted' ? [3, 6] : [];
  const pl = object.headStyle === 'none' ? 0 : 10;
  const pw = object.headStyle === 'none' ? 0 : 8;
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(object.id, e.evt.shiftKey);
  };
  const common = {
    opacity: object.visible ? object.opacity : 0,
    listening: activeTool === 'select',
    onClick: handleClick,
  };
  if (object.arrowShape === 'zigzag') {
    const pts = getZigzagPoints(object.startX, object.startY, object.endX, object.endY);
    return <Line points={pts} stroke={color} strokeWidth={sw} dash={dash} {...common} />;
  }
  if (object.arrowShape === 'curved') {
    const d = `M ${object.startX} ${object.startY} Q ${object.cpX} ${object.cpY} ${object.endX} ${object.endY}`;
    return <Path data={d} stroke={color} strokeWidth={sw} dash={dash} fill="transparent" {...common} />;
  }
  return (
    <Arrow
      points={[object.startX, object.startY, object.endX, object.endY]}
      stroke={color} fill={object.headStyle === 'filled' ? color : 'transparent'}
      strokeWidth={sw} pointerLength={pl} pointerWidth={pw} dash={dash}
      shadowEnabled={isSelected} shadowColor="#63C0B0" shadowBlur={6} shadowOpacity={0.5}
      {...common}
    />
  );
});
