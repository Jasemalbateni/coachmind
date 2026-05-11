import type { Command, CanvasObject } from '../types';

export interface ObjStore {
  _rawAdd(obj: CanvasObject): void;
  _rawRemove(id: string): void;
  _rawUpdate(id: string, patch: Partial<CanvasObject>): void;
  getObject(id: string): CanvasObject | undefined;
}

export class AddObjectCommand implements Command {
  label: string;
  constructor(private store: ObjStore, private obj: CanvasObject) {
    this.label = `Add ${obj.type}`;
  }
  execute() { this.store._rawAdd(this.obj); }
  undo() { this.store._rawRemove(this.obj.id); }
}

export class DeleteObjectsCommand implements Command {
  label: string;
  constructor(private store: ObjStore, private objects: CanvasObject[]) {
    this.label = objects.length === 1 ? `Delete ${objects[0].type}` : `Delete ${objects.length} objects`;
  }
  execute() { this.objects.forEach(o => this.store._rawRemove(o.id)); }
  undo() { this.objects.forEach(o => this.store._rawAdd(o)); }
}

export class MoveObjectsCommand implements Command {
  label = 'Move';
  constructor(
    private store: ObjStore,
    private moves: Array<{ id: string; fromX: number; fromY: number; toX: number; toY: number }>
  ) {}
  execute() {
    this.moves.forEach(m => {
      this.store._rawUpdate(m.id, { x: m.toX, y: m.toY } as Partial<CanvasObject>);
    });
  }
  undo() {
    this.moves.forEach(m => {
      this.store._rawUpdate(m.id, { x: m.fromX, y: m.fromY } as Partial<CanvasObject>);
    });
  }
}

export class UpdateObjectCommand implements Command {
  constructor(
    private store: ObjStore,
    private id: string,
    private patch: Partial<CanvasObject>,
    private before: Partial<CanvasObject>,
    public label = 'Update'
  ) {}
  execute() { this.store._rawUpdate(this.id, this.patch); }
  undo() { this.store._rawUpdate(this.id, this.before); }
}

export class BatchCommand implements Command {
  constructor(public label: string, private cmds: Command[]) {}
  execute() { this.cmds.forEach(c => c.execute()); }
  undo() { [...this.cmds].reverse().forEach(c => c.undo()); }
}
