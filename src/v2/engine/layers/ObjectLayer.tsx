'use client';
import React, { useRef, useCallback } from 'react';
import { Layer } from 'react-konva';
import { useEditorStore } from '../../store/editorStore';
import { PlayerRenderer } from '../renderers/PlayerRenderer';
import { ConeRenderer } from '../renderers/ConeRenderer';
import { BallRenderer } from '../renderers/BallRenderer';
import { GoalRenderer } from '../renderers/GoalRenderer';
import { ArrowRenderer } from '../renderers/ArrowRenderer';
import { ShapeRenderer } from '../renderers/ShapeRenderer';
import type { CanvasObject, PlayerObject, ConeObject, BallObject, GoalObject, ArrowObject, ZoneObject, RectObject, CircleObject, TextObject, SmartConeAreaObject } from '../../types';

interface DragSnapshot {
  startX: number;
  startY: number;
}

export function ObjectLayer() {
  const getObjectsInOrder = useEditorStore(s => s.getObjectsInOrder);
  const selectedIds = useEditorStore(s => s.selectedIds);
  const hoveredId = useEditorStore(s => s.hoveredId);
  const select = useEditorStore(s => s.select);
  const multiSelect = useEditorStore(s => s.multiSelect);
  const moveObjects = useEditorStore(s => s.moveObjects);
  const setHovered = useEditorStore(s => s.setHovered);

  const dragSnapshots = useRef<Map<string, DragSnapshot>>(new Map());

  const handleSelect = useCallback((id: string, shift: boolean) => {
    if (shift) {
      multiSelect(id);
    } else {
      select(id);
    }
  }, [select, multiSelect]);

  const handleDragStart = useCallback((id: string, x: number, y: number) => {
    dragSnapshots.current.set(id, { startX: x, startY: y });
  }, []);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    const snapshot = dragSnapshots.current.get(id);
    if (!snapshot) return;
    dragSnapshots.current.delete(id);
    moveObjects([{
      id,
      fromX: snapshot.startX,
      fromY: snapshot.startY,
      toX: x,
      toY: y,
    }]);
  }, [moveObjects]);

  const objects = getObjectsInOrder();

  return (
    <Layer>
      {objects.map(obj => {
        const isSelected = selectedIds.includes(obj.id);
        const isHovered = hoveredId === obj.id;

        if (obj.type === 'player') {
          return (
            <PlayerRenderer
              key={obj.id}
              object={obj as PlayerObject}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
            />
          );
        }
        if (obj.type === 'cone') {
          return (
            <ConeRenderer
              key={obj.id}
              object={obj as ConeObject}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
            />
          );
        }
        if (obj.type === 'ball') {
          return (
            <BallRenderer
              key={obj.id}
              object={obj as BallObject}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
            />
          );
        }
        if (obj.type === 'goal') {
          return (
            <GoalRenderer
              key={obj.id}
              object={obj as GoalObject}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
            />
          );
        }
        if (obj.type === 'arrow') {
          return (
            <ArrowRenderer
              key={obj.id}
              object={obj as ArrowObject}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={handleSelect}
            />
          );
        }
        // zone, rect, circle, text, smart-cone-area
        return (
          <ShapeRenderer
            key={obj.id}
            object={obj as ZoneObject | RectObject | CircleObject | TextObject | SmartConeAreaObject}
            isSelected={isSelected}
            isHovered={isHovered}
            onSelect={handleSelect}
            onDragEnd={handleDragEnd}
          />
        );
      })}
    </Layer>
  );
}
