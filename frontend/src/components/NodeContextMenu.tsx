import type { GoalNode } from '../models/graph';

type NodeContextMenuProps = {
  node: GoalNode;
  x: number;
  y: number;
  onFocus: () => void;
  onExpandOne: () => void;
  onCollapseOne: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClose: () => void;
};

export function NodeContextMenu({
  node,
  x,
  y,
  onFocus,
  onExpandOne,
  onCollapseOne,
  onExpandAll,
  onCollapseAll,
  onClose
}: NodeContextMenuProps) {
  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="context-menu-backdrop" onClick={onClose}>
      <div className="node-context-menu" style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>
        <strong>{node.title}</strong>
        <button type="button" onClick={() => run(onFocus)}>
          Focus
        </button>
        <button type="button" onClick={() => run(onExpandOne)}>
          Expand one
        </button>
        <button type="button" onClick={() => run(onCollapseOne)}>
          Collapse one
        </button>
        <button type="button" onClick={() => run(onExpandAll)}>
          Expand all
        </button>
        <button type="button" onClick={() => run(onCollapseAll)}>
          Collapse all
        </button>
      </div>
    </div>
  );
}
