import type { CanvasObject } from '../../types';

export interface Bounds { x: number; y: number; width: number; height: number; }

export function getObjectBounds(obj: CanvasObject): Bounds {
  switch (obj.type) {
    case 'player': { const r = 18; return { x: obj.x - r, y: obj.y - r, width: r*2, height: r*2 }; }
    case 'cone':   { const r = obj.size/2; return { x: obj.x-r, y: obj.y-r, width: r*2, height: r*2 }; }
    case 'ball':   { const r = obj.size/2; return { x: obj.x-r, y: obj.y-r, width: r*2, height: r*2 }; }
    case 'goal':   return { x: obj.x - obj.imgW/2, y: obj.y - obj.imgH/2, width: obj.imgW, height: obj.imgH };
    case 'arrow':  return {
      x: Math.min(obj.startX, obj.endX), y: Math.min(obj.startY, obj.endY),
      width: Math.abs(obj.endX-obj.startX)+1, height: Math.abs(obj.endY-obj.startY)+1,
    };
    case 'zone': case 'rect': case 'smart-cone-area':
      return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    case 'circle': return { x: obj.x-obj.radius, y: obj.y-obj.radius, width: obj.radius*2, height: obj.radius*2 };
    case 'text':   return { x: obj.x, y: obj.y, width: obj.width, height: obj.fontSize*2 };
    default: return { x:0, y:0, width:1, height:1 };
  }
}

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}
