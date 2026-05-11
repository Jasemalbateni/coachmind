'use client';

import type { Drill } from '@/types';

interface Props {
  drill: Drill;
  width?: number;
  height?: number;
  className?: string;
}

export default function MiniPitchPreview({ drill, width = 80, height = 50, className = '' }: Props) {
  const PW = drill.pitch.width;
  const PH = drill.pitch.height;
  const scaleX = width / PW;
  const scaleY = height / PH;
  const px = (x: number) => x * scaleX;
  const py = (y: number) => y * scaleY;
  const grassColor = drill.pitch.colors?.grass ?? '#1e5c35';
  const lineColor = 'rgba(255,255,255,0.18)';
  const midX = width / 2;
  const midY = height / 2;

  return (
    <svg
      width={width}
      height={height}
      className={`rounded shrink-0 ${className}`}
      style={{ display: 'block' }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={grassColor} rx="3" />

      {/* Pitch markings */}
      <rect x={1} y={1} width={width - 2} height={height - 2} fill="none" stroke={lineColor} strokeWidth={0.75} rx="2" />
      {drill.pitch.type !== 'third' && drill.pitch.type !== 'plain' && (
        <line x1={midX} y1={2} x2={midX} y2={height - 2} stroke={lineColor} strokeWidth={0.5} />
      )}
      <circle cx={midX} cy={midY} r={Math.min(width, height) * 0.12} fill="none" stroke={lineColor} strokeWidth={0.5} />

      {/* Zones first (behind everything) */}
      {drill.objects.map((obj) => {
        if (obj.type !== 'zone') return null;
        return (
          <rect
            key={obj.id}
            x={px(obj.x)}
            y={py(obj.y)}
            width={Math.max(1, px(obj.width))}
            height={Math.max(1, py(obj.height))}
            fill={obj.fill}
            fillOpacity={Math.min(1, obj.opacity * 1.5)}
          />
        );
      })}

      {/* Arrows, lines, and curved lines */}
      {drill.objects.map((obj) => {
        if (obj.type === 'arrow') {
          return (
            <line
              key={obj.id}
              x1={px(obj.startX)} y1={py(obj.startY)}
              x2={px(obj.endX)} y2={py(obj.endY)}
              stroke={obj.color} strokeWidth={0.7} opacity={0.6}
              strokeDasharray={obj.style === 'dashed' ? '2,2' : undefined}
            />
          );
        }
        if (obj.type === 'line') {
          return (
            <line
              key={obj.id}
              x1={px(obj.startX)} y1={py(obj.startY)}
              x2={px(obj.endX)} y2={py(obj.endY)}
              stroke={obj.color} strokeWidth={0.6} opacity={0.5}
              strokeDasharray={obj.dashed ? '2,2' : undefined}
            />
          );
        }
        if (obj.type === 'curved') {
          return (
            <path
              key={obj.id}
              d={`M ${px(obj.startX)} ${py(obj.startY)} Q ${px(obj.cpX)} ${py(obj.cpY)} ${px(obj.endX)} ${py(obj.endY)}`}
              stroke={obj.color} strokeWidth={0.6} opacity={0.6} fill="none"
              strokeDasharray={obj.dashed ? '2,2' : undefined}
            />
          );
        }
        return null;
      })}

      {/* Goals and cones */}
      {drill.objects.map((obj) => {
        if (obj.type === 'goal') {
          const gw = obj.size === 'full' ? 9 : 5;
          return (
            <rect
              key={obj.id}
              x={px(obj.x) - 1.5}
              y={py(obj.y) - gw / 2}
              width={3}
              height={gw}
              fill="white"
              fillOpacity={0.85}
              rx={0.5}
            />
          );
        }
        if (obj.type === 'cone') {
          return <polygon key={obj.id} points={`${px(obj.x)},${py(obj.y) - 2.5} ${px(obj.x) - 2},${py(obj.y) + 1.5} ${px(obj.x) + 2},${py(obj.y) + 1.5}`} fill={obj.color} />;
        }
        return null;
      })}

      {/* Balls */}
      {drill.objects.filter((o) => o.type === 'ball').map((obj) => (
        <circle key={obj.id} cx={px(obj.x)} cy={py(obj.y)} r={1.8} fill="white" />
      ))}

      {/* Players (rendered last / on top) */}
      {drill.objects.map((obj) => {
        if (obj.type !== 'player') return null;
        const color = obj.color || (obj.team === 'A' ? '#3b82f6' : obj.team === 'B' ? '#ef4444' : '#888888');
        return (
          <circle
            key={obj.id}
            cx={px(obj.x)}
            cy={py(obj.y)}
            r={3}
            fill={color}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}
