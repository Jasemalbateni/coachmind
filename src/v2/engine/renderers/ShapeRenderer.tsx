'use client';
import React from 'react';
import { Rect, Circle, Text, Group, RegularPolygon, Line } from 'react-konva';
import type { ZoneObject, RectObject, CircleObject, TextObject, SmartConeAreaObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import type Konva from 'konva';

type ShapeObject = ZoneObject | RectObject | CircleObject | TextObject | SmartConeAreaObject;
interface Props {
  object: ShapeObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const CONE_COLORS: Record<string, string> = {
  'cone': '#FF6B35', 'blue-cone': '#2176AE', 'red-cone': '#E63946',
  'green-cone': '#2DC653', 'yellow-cone': '#FFD60A',
};

export const ShapeRenderer = React.memo(function ShapeRenderer({ object, isSelected, isHovered, onSelect, onDragEnd }: Props) {
  const activeTool = useEditorStore(s => s.activeTool);
  const sel = isSelected;

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(object.id, e.evt.shiftKey);
  };
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(object.id, e.target.x(), e.target.y());
  };

  const shared = {
    opacity: object.visible ? object.opacity : 0,
    draggable: activeTool === 'select' && !object.locked,
    listening: activeTool === 'select',
    onClick: handleClick,
    onDragEnd: handleDragEnd,
  };

  if (object.type === 'circle') {
    return (
      <Circle x={object.x} y={object.y} radius={object.radius}
        fill={object.fill}
        stroke={sel ? '#63C0B0' : object.stroke}
        strokeWidth={object.strokeWidth * (sel ? 2 : 1)}
        dash={object.strokeDashed ? [10, 5] : []}
        {...shared} />
    );
  }

  if (object.type === 'text') {
    return (
      <Group x={object.x} y={object.y} {...shared}>
        {object.showBackground && (
          <Rect width={object.width + object.backgroundPadding*2}
            height={object.fontSize*1.6 + object.backgroundPadding*2}
            fill={object.backgroundColor} cornerRadius={4}
            offsetX={object.backgroundPadding} offsetY={object.backgroundPadding}
            stroke={sel ? '#63C0B0' : 'transparent'} strokeWidth={sel ? 2 : 0}
            listening={false} />
        )}
        <Text text={object.text} width={object.width} fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          fontStyle={`${object.fontStyle} ${object.fontWeight}`}
          fill={object.color} align={object.align} listening={false} />
      </Group>
    );
  }

  if (object.type === 'smart-cone-area') {
    const { x, y, width, height, extraConesPerSide, coneVariant } = object;
    const pts: Array<[number, number]> = [];
    const sides: Array<[[number,number],[number,number]]> = [
      [[x,y],[x+width,y]], [[x+width,y],[x+width,y+height]],
      [[x+width,y+height],[x,y+height]], [[x,y+height],[x,y]],
    ];
    sides.forEach(([from, to]) => {
      for (let i = 0; i <= extraConesPerSide+1; i++) {
        const t = i/(extraConesPerSide+1);
        pts.push([from[0]+(to[0]-from[0])*t, from[1]+(to[1]-from[1])*t]);
      }
    });
    const unique = pts.filter((p,i) => pts.findIndex(q => Math.abs(q[0]-p[0])<0.5 && Math.abs(q[1]-p[1])<0.5) === i);
    const coneColor = CONE_COLORS[coneVariant] ?? '#FF6B35';
    return (
      <Group {...shared}>
        {object.showBorder && (
          <Rect x={x} y={y} width={width} height={height} fill="transparent"
            stroke={sel ? '#63C0B0' : object.borderColor} strokeWidth={1.5}
            dash={object.borderDashed ? [8,4] : []} />
        )}
        {unique.map(([cx, cy], i) => (
          <RegularPolygon key={i} x={cx} y={cy} sides={3} radius={8}
            fill={coneColor} stroke="rgba(0,0,0,0.3)" strokeWidth={1} rotation={180} listening={false} />
        ))}
      </Group>
    );
  }

  // zone or rect
  if (object.type === 'zone') {
    return (
      <Rect
        x={object.x} y={object.y} width={object.width} height={object.height}
        fill={object.fill} fillOpacity={object.fillOpacity}
        stroke={sel ? '#63C0B0' : object.stroke}
        strokeWidth={object.strokeWidth * (sel ? 2 : 1)}
        dash={object.strokeDashed ? [10,5] : []}
        {...shared} />
    );
  }

  if (object.type === 'rect') {
    return (
      <Rect
        x={object.x} y={object.y} width={object.width} height={object.height}
        fill={object.fill} fillOpacity={object.fillOpacity}
        stroke={sel ? '#63C0B0' : object.stroke}
        strokeWidth={object.strokeWidth * (sel ? 2 : 1)}
        dash={object.strokeDashed ? [10,5] : []}
        cornerRadius={object.cornerRadius}
        {...shared} />
    );
  }

  return null;
});
