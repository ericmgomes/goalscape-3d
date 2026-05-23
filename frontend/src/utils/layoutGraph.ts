import type { GoalGraph, GoalNode, PositionedGoalNode } from '../models/graph';

const LEVEL_DISTANCE = 3.9;
const LEVEL_Y_STEP = -2.2;
const MIN_GAP = 1.55;

export function layoutGraph(graph: GoalGraph): { nodes: PositionedGoalNode[]; edges: GoalGraph['edges'] } {
  const childrenByParent = new Map<string, string[]>();
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const positioned = new Map<string, PositionedGoalNode>();
  const roots = graph.nodes.filter((node) => !node.parentId);
  const subtreeWeightCache = new Map<string, number>();

  graph.nodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node.id]);
  });

  const rootIds = roots.length ? roots.map((root) => root.id) : graph.nodes.slice(0, 1).map((node) => node.id);
  const rootSpread = Math.PI * 2;

  rootIds.forEach((rootId, index) => {
    const angle = rootIds.length <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (rootSpread * index) / rootIds.length;
    const radius = rootIds.length <= 1 ? 0 : LEVEL_DISTANCE;
    placeBranch(rootId, {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
      direction: angle,
      spread: rootSpread / Math.max(1, rootIds.length),
      depth: 0
    });
  });

  const nodes = graph.nodes.map((node) => positioned.get(node.id) ?? { ...node, x: 0, y: 0, z: 0 });
  relaxCollisions(nodes);

  return {
    nodes,
    edges: graph.edges
  };

  function placeBranch(
    nodeId: string,
    context: {
      x: number;
      y: number;
      z: number;
      direction: number;
      spread: number;
      depth: number;
    }
  ) {
    const node = nodeById.get(nodeId);

    if (!node) {
      return;
    }

    positioned.set(nodeId, {
      ...node,
      x: context.x,
      y: context.y,
      z: context.z
    });

    const childIds = [...(childrenByParent.get(nodeId) ?? [])].sort(
      (first, second) => subtreeWeight(second) - subtreeWeight(first)
    );

    if (!childIds.length) {
      return;
    }

    const spread = Math.min(Math.PI * 1.45, Math.max(Math.PI / 4, context.spread * 1.2));
    const startAngle = context.direction - spread / 2;
    const totalWeight = childIds.reduce((sum, childId) => sum + subtreeWeight(childId), 0);
    let cursor = 0;

    childIds.forEach((childId, index) => {
      const child = nodeById.get(childId);
      const childWeight = subtreeWeight(childId);
      const segment = totalWeight > 0 ? spread * (childWeight / totalWeight) : spread / childIds.length;
      const angle =
        childIds.length === 1 ? context.direction : startAngle + cursor + segment / 2 + deterministicJitter(childId) * 0.06;
      const parentRadius = estimatedRadius(node);
      const childRadius = child ? estimatedRadius(child) : 1;
      const branchPressure = Math.min(1.8, Math.sqrt(childWeight) * 0.32);
      const distance = LEVEL_DISTANCE + parentRadius * 0.38 + childRadius * 0.56 + branchPressure + context.depth * 0.45;

      placeBranch(childId, {
        x: context.x + Math.cos(angle) * distance,
        y: context.y + LEVEL_Y_STEP,
        z: context.z + Math.sin(angle) * distance,
        direction: angle,
        spread: Math.max(Math.PI / 6, segment * 1.35),
        depth: context.depth + 1
      });

      cursor += segment;
    });
  }

  function subtreeWeight(nodeId: string): number {
    const cached = subtreeWeightCache.get(nodeId);

    if (typeof cached === 'number') {
      return cached;
    }

    const node = nodeById.get(nodeId);
    const children = childrenByParent.get(nodeId) ?? [];
    const ownWeight = node ? estimatedRadius(node) * 1.4 : 1;
    const childWeight = children.reduce((sum, childId) => sum + subtreeWeight(childId) * 0.62, 0);
    const weight = Math.max(0.8, ownWeight + childWeight);

    subtreeWeightCache.set(nodeId, weight);
    return weight;
  }
}

function relaxCollisions(nodes: PositionedGoalNode[]) {
  for (let iteration = 0; iteration < 90; iteration += 1) {
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const first = nodes[a];
        const second = nodes[b];
        const dx = second.x - first.x;
        const dz = second.z - first.z;
        const distance = Math.hypot(dx, dz) || 0.001;
        const minDistance = estimatedRadius(first) + estimatedRadius(second) + MIN_GAP;

        if (distance >= minDistance) {
          continue;
        }

        const push = (minDistance - distance) * 0.44;
        const nx = dx / distance;
        const nz = dz / distance;

        first.x -= nx * push;
        first.z -= nz * push;
        second.x += nx * push;
        second.z += nz * push;
      }
    }
  }
}

function estimatedRadius(node: GoalNode): number {
  const normalizedImportance = typeof node.size === 'number' ? Math.min(1, Math.max(0.02, node.size)) : 0.42;
  const level = node.level ?? 0;
  const parentEquivalentRadius = level === 0 ? 3.55 : 3.35;
  return Math.max(0.72, Math.sqrt(normalizedImportance) * parentEquivalentRadius - level * 0.06);
}

function deterministicJitter(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return (hash % 1000) / 1000 - 0.5;
}
