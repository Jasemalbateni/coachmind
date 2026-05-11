'use client';
import React from 'react';
import { Layer, Rect, Circle, Line, Arc } from 'react-konva';
import type { PitchConfig } from '../../types';

interface Props { pitch: PitchConfig; }

export const PitchLayer = React.memo(function PitchLayer({ pitch }: Props) {
  const { width: W, height: H, colors, type } = pitch;
  const PAD = 20;
  const lineColor = colors.lines;
  const grassColor = colors.grass;
  const grassAlt = colors.grassAlt ?? grassColor;

  if (type === 'plain') {
    return (
      <Layer listening={false}>
        <Rect x={0} y={0} width={W} height={H} fill="#1a1a2e" />
      </Layer>
    );
  }

  const pw = W - PAD * 2;   // pitch width inside padding
  const ph = H - PAD * 2;   // pitch height inside padding
  const ox = PAD;            // origin x
  const oy = PAD;            // origin y

  // Stripe rendering for grass
  const stripeCount = 8;
  const stripeW = pw / stripeCount;

  const stripes = Array.from({ length: stripeCount }, (_, i) => (
    <Rect
      key={`stripe-${i}`}
      x={ox + i * stripeW} y={oy}
      width={stripeW} height={ph}
      fill={i % 2 === 0 ? grassColor : grassAlt}
      listening={false}
    />
  ));

  // Full pitch markings
  if (type === 'full') {
    // Penalty area dims (proportional to pitch)
    const penAreaW = pw * 0.165;  // ~100px of 600 pitch width equiv
    const penAreaH = ph * 0.325;  // ~176px of 540 pitch height equiv
    const goalAreaW = pw * 0.072;
    const goalAreaH = ph * 0.148;
    const penSpotDist = ph * 0.204; // penalty spot from goal line
    const centerCircleR = Math.min(pw, ph) * 0.085;

    return (
      <Layer listening={false}>
        {/* Background */}
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} />
        {/* Stripes */}
        {stripes}
        {/* Border */}
        <Rect x={ox} y={oy} width={pw} height={ph}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Center line */}
        <Line points={[ox + pw/2, oy, ox + pw/2, oy + ph]}
          stroke={lineColor} strokeWidth={2} />
        {/* Center circle */}
        <Circle x={ox + pw/2} y={oy + ph/2} radius={centerCircleR}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Center spot */}
        <Circle x={ox + pw/2} y={oy + ph/2} radius={3}
          fill={lineColor} />

        {/* LEFT penalty area */}
        <Rect x={ox} y={oy + ph/2 - penAreaH/2} width={penAreaW} height={penAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* LEFT goal area */}
        <Rect x={ox} y={oy + ph/2 - goalAreaH/2} width={goalAreaW} height={goalAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* LEFT penalty spot */}
        <Circle x={ox + penSpotDist} y={oy + ph/2} radius={3} fill={lineColor} />
        {/* LEFT penalty arc */}
        <Arc
          x={ox + penSpotDist} y={oy + ph/2}
          innerRadius={0} outerRadius={centerCircleR}
          angle={120} rotation={-60 + 90}
          fill="transparent" stroke={lineColor} strokeWidth={2}
        />

        {/* RIGHT penalty area */}
        <Rect x={ox + pw - penAreaW} y={oy + ph/2 - penAreaH/2} width={penAreaW} height={penAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* RIGHT goal area */}
        <Rect x={ox + pw - goalAreaW} y={oy + ph/2 - goalAreaH/2} width={goalAreaW} height={goalAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* RIGHT penalty spot */}
        <Circle x={ox + pw - penSpotDist} y={oy + ph/2} radius={3} fill={lineColor} />
        {/* RIGHT penalty arc */}
        <Arc
          x={ox + pw - penSpotDist} y={oy + ph/2}
          innerRadius={0} outerRadius={centerCircleR}
          angle={120} rotation={60 - 90}
          fill="transparent" stroke={lineColor} strokeWidth={2}
        />

        {/* Corner arcs - top-left */}
        <Arc x={ox} y={oy} innerRadius={0} outerRadius={10} angle={90} rotation={0}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* top-right */}
        <Arc x={ox + pw} y={oy} innerRadius={0} outerRadius={10} angle={90} rotation={90}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* bottom-left */}
        <Arc x={ox} y={oy + ph} innerRadius={0} outerRadius={10} angle={90} rotation={270}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* bottom-right */}
        <Arc x={ox + pw} y={oy + ph} innerRadius={0} outerRadius={10} angle={90} rotation={180}
          fill="transparent" stroke={lineColor} strokeWidth={2} />

        {/* Goals (white posts) */}
        <Rect x={ox - 12} y={oy + ph/2 - 28} width={12} height={56}
          fill="rgba(255,255,255,0.15)" stroke={lineColor} strokeWidth={2} />
        <Rect x={ox + pw} y={oy + ph/2 - 28} width={12} height={56}
          fill="rgba(255,255,255,0.15)" stroke={lineColor} strokeWidth={2} />
      </Layer>
    );
  }

  if (type === 'half') {
    const penAreaW = pw * 0.165;
    const penAreaH = ph * 0.42;
    const goalAreaW = pw * 0.072;
    const goalAreaH = ph * 0.19;
    const penSpotDist = ph * 0.26;
    const centerCircleR = Math.min(pw, ph) * 0.11;

    return (
      <Layer listening={false}>
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} />
        {stripes}
        {/* Border */}
        <Rect x={ox} y={oy} width={pw} height={ph}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Halfway line at bottom */}
        <Line points={[ox, oy + ph, ox + pw, oy + ph]}
          stroke={lineColor} strokeWidth={2} />
        {/* Center circle half — semicircle at bottom */}
        <Arc
          x={ox + pw/2} y={oy + ph}
          innerRadius={0} outerRadius={centerCircleR}
          angle={180} rotation={180}
          fill="transparent" stroke={lineColor} strokeWidth={2}
        />
        {/* Penalty area */}
        <Rect x={ox + pw/2 - penAreaW/2} y={oy}
          width={penAreaW} height={penAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Goal area */}
        <Rect x={ox + pw/2 - goalAreaW/2} y={oy}
          width={goalAreaW} height={goalAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Penalty spot */}
        <Circle x={ox + pw/2} y={oy + penSpotDist} radius={3} fill={lineColor} />
        {/* Penalty arc */}
        <Arc
          x={ox + pw/2} y={oy + penSpotDist}
          innerRadius={0} outerRadius={centerCircleR}
          angle={120} rotation={30}
          fill="transparent" stroke={lineColor} strokeWidth={2}
        />
        {/* Goal */}
        <Rect x={ox + pw/2 - 32} y={oy - 12} width={64} height={12}
          fill="rgba(255,255,255,0.15)" stroke={lineColor} strokeWidth={2} />
        {/* Corner arcs bottom */}
        <Arc x={ox} y={oy + ph} innerRadius={0} outerRadius={10} angle={90} rotation={270}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        <Arc x={ox + pw} y={oy + ph} innerRadius={0} outerRadius={10} angle={90} rotation={180}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Corner flags top */}
        <Arc x={ox} y={oy} innerRadius={0} outerRadius={10} angle={90} rotation={0}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        <Arc x={ox + pw} y={oy} innerRadius={0} outerRadius={10} angle={90} rotation={90}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
      </Layer>
    );
  }

  if (type === 'third') {
    const penAreaW = pw * 0.165;
    const penAreaH = ph * 0.55;
    const goalAreaW = pw * 0.072;
    const goalAreaH = ph * 0.25;
    const penSpotDist = ph * 0.35;
    const centerCircleR = Math.min(pw, ph) * 0.12;

    return (
      <Layer listening={false}>
        <Rect x={0} y={0} width={W} height={H} fill={grassColor} />
        {stripes}
        <Rect x={ox} y={oy} width={pw} height={ph}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Penalty area */}
        <Rect x={ox + pw/2 - penAreaW/2} y={oy}
          width={penAreaW} height={penAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Goal area */}
        <Rect x={ox + pw/2 - goalAreaW/2} y={oy}
          width={goalAreaW} height={goalAreaH}
          fill="transparent" stroke={lineColor} strokeWidth={2} />
        {/* Penalty spot */}
        <Circle x={ox + pw/2} y={oy + penSpotDist} radius={3} fill={lineColor} />
        {/* Penalty arc */}
        <Arc
          x={ox + pw/2} y={oy + penSpotDist}
          innerRadius={0} outerRadius={centerCircleR}
          angle={120} rotation={30}
          fill="transparent" stroke={lineColor} strokeWidth={2}
        />
        {/* Goal */}
        <Rect x={ox + pw/2 - 32} y={oy - 12} width={64} height={12}
          fill="rgba(255,255,255,0.15)" stroke={lineColor} strokeWidth={2} />
      </Layer>
    );
  }

  return <Layer listening={false}><Rect x={0} y={0} width={W} height={H} fill={grassColor} /></Layer>;
});
