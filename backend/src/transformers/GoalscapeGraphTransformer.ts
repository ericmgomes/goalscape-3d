import { GoalEdge, GoalNode, type GoalGraph } from '../models/graph.js';
import type { GoalscapeGoal } from '../models/goalscape.js';

export class GoalscapeGraphTransformer {
  transform(goals: GoalscapeGoal[]): GoalGraph {
    if (this.isFlatGoalList(goals)) {
      return this.transformFlatList(goals);
    }

    const nodes: GoalNode[] = [];
    const edges: GoalEdge[] = [];
    const seen = new Set<string>();

    goals.forEach((goal, index) => {
      this.visitGoal(goal, {
        indexPath: `${index}`,
        level: 0,
        nodes,
        edges,
        seen
      });
    });

    this.normalizeSiblingSizes(nodes);

    return { nodes, edges };
  }

  private isFlatGoalList(goals: GoalscapeGoal[]): boolean {
    return goals.some((goal) => Boolean(goal.parentId ?? goal.parentGoalId));
  }

  private transformFlatList(goals: GoalscapeGoal[]): GoalGraph {
    const nodes = goals.map((goal) => {
      const id = String(goal.id ?? goal.goalId);
      const parentId = goal.parentId ?? goal.parentGoalId;

      return new GoalNode(
        id,
        goal.title ?? goal.name ?? 'Untitled goal',
        goal.description,
        this.normalizeProgress(goal.progress),
        undefined,
        parentId ? String(parentId) : undefined,
        goal.color,
        this.normalizeSize(goal)
      );
    });

    const levelById = new Map<string, number>();
    const parentById = new Map(nodes.map((node) => [node.id, node.parentId]));

    const getLevel = (id: string): number => {
      if (levelById.has(id)) {
        return levelById.get(id)!;
      }

      const parentId = parentById.get(id);
      const level = parentId ? getLevel(parentId) + 1 : 0;
      levelById.set(id, level);
      return level;
    };

    nodes.forEach((node) => {
      node.level = getLevel(node.id);
    });

    this.normalizeSiblingSizes(nodes);

    return {
      nodes,
      edges: nodes.flatMap((node) => (node.parentId ? [new GoalEdge(node.parentId, node.id)] : []))
    };
  }

  private visitGoal(
    goal: GoalscapeGoal,
    context: {
      indexPath: string;
      level: number;
      parentId?: string;
      nodes: GoalNode[];
      edges: GoalEdge[];
      seen: Set<string>;
    }
  ): void {
    const id = String(goal.id ?? goal.goalId ?? context.indexPath);

    if (context.seen.has(id)) {
      return;
    }

    context.seen.add(id);
    const title = goal.title ?? goal.name ?? 'Untitled goal';

    context.nodes.push(
      new GoalNode(
        id,
        title,
        goal.description,
        this.normalizeProgress(goal.progress),
        context.level,
        context.parentId,
        goal.color,
        this.normalizeSize(goal)
      )
    );

    if (context.parentId) {
      context.edges.push(new GoalEdge(context.parentId, id));
    }

    const children = goal.children ?? goal.subgoals ?? goal.goals ?? [];

    children.forEach((child, index) => {
      this.visitGoal(child, {
        indexPath: `${context.indexPath}.${index}`,
        level: context.level + 1,
        parentId: id,
        nodes: context.nodes,
        edges: context.edges,
        seen: context.seen
      });
    });
  }

  private normalizeProgress(progress: number | undefined): number | undefined {
    if (typeof progress !== 'number') {
      return undefined;
    }

    return progress > 1 ? progress / 100 : progress;
  }

  private normalizeSize(goal: GoalscapeGoal): number | undefined {
    const rawSize = goal.importance ?? goal.weight ?? goal.size;

    if (typeof rawSize !== 'number') {
      return undefined;
    }

    if (rawSize <= 0) {
      return 0.2;
    }

    return rawSize > 1 ? rawSize / 100 : rawSize;
  }

  private normalizeSiblingSizes(nodes: GoalNode[]): void {
    const groups = new Map<string, GoalNode[]>();

    nodes.forEach((node) => {
      const groupId = node.parentId ?? '__root__';
      groups.set(groupId, [...(groups.get(groupId) ?? []), node]);
    });

    groups.forEach((siblings) => {
      if (siblings.length === 1) {
        siblings[0].size = siblings[0].parentId ? 1 : (siblings[0].size ?? 1);
        return;
      }

      const fallbackShare = 1 / siblings.length;
      const total = siblings.reduce((sum, node) => sum + (typeof node.size === 'number' ? node.size : fallbackShare), 0);

      siblings.forEach((node) => {
        const rawSize = typeof node.size === 'number' ? node.size : fallbackShare;
        node.size = total > 0 ? rawSize / total : fallbackShare;
      });
    });
  }
}
