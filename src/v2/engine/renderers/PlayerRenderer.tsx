'use client';
import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { PlayerObject } from '../../types';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  object: PlayerObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export const PlayerRenderer = React.memo(function PlayerRenderer({ object, isSelected, isHovered, onSelect, onDragEnd }: Props) {
  const showNumbers = useEditorStore(s => s.showNumbers);
  const showNames = useEditorStore(s => s.showNames);
  const playerScale = useEditorStore(s => s.playerScale);
  const activeTool = useEditorStore(s => s.activeTool);

  const radius = 18 * playerScale * object.localScale;
  const strokeColor = isSelected ? '#63C0B0' : isHovered ? '#FFFFFF' : object.strokeColor;
  const strokeWidth = isSelected ? 3 : 1.5;

  return (
    <Group
      x={object.x} y={object.y}
      opacity={object.visible ? object.opacity : 0}
      draggable={activeTool === 'select' && !object.locked}
      listening={activeTool === 'select' || activeTool === 'link'}
      onClick={(e) => { e.cancelBubble = true; onSelect(object.id, e.evt.shiftKey); }}
      onDragEnd={(e) => { onDragEnd(object.id, e.target.x(), e.target.y()); }}
    >
      {object.isGoalkeeper && (
        <Circle radius={radius + 5} fill="transparent" stroke="#FFC857" strokeWidth={2.5} />
      )}
      <Circle
        radius={radius}
        fill={object.bib ? object.bibColor : object.color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        shadowEnabled={isSelected}
        shadowColor="#63C0B0"
        shadowBlur={10}
        shadowOpacity={0.6}
      />
      {showNumbers && object.number !== '' && (
        <Text
          text={object.number}
          fontSize={Math.max(10, radius * 0.85)}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="bold"
          fill={object.numberColor}
          align="center" verticalAlign="middle"
          width={radius*2} height={radius*2}
          offsetX={radius} offsetY={radius}
          listening={false}
        />
      )}
      {showNames && object.name && (
        <Text
          text={object.name}
          y={radius + 4}
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#FFFFFF"
          align="center" width={80} offsetX={40}
          listening={false}
        />
      )}
    </Group>
  );
});
