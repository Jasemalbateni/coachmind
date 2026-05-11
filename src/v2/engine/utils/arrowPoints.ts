export function getZigzagPoints(
  startX: number, startY: number, endX: number, endY: number,
  amplitude = 8, segments = 6
): number[] {
  const points: number[] = [];
  const dx = endX - startX, dy = endY - startY;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const px = -dy/len, py = dx/len;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startX + dx * t;
    const y = startY + dy * t;
    const offset = i % 2 === 0 ? 0 : amplitude;
    points.push(x + px*offset, y + py*offset);
  }
  return points;
}
