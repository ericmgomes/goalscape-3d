export type GoalNode = {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  level?: number;
  parentId?: string;
  color?: string;
  size?: number;
};

export type GoalEdge = {
  source: string;
  target: string;
  type: 'parent-child';
};

export type GoalGraph = {
  nodes: GoalNode[];
  edges: GoalEdge[];
};

export type PositionedGoalNode = GoalNode & {
  x: number;
  y: number;
  z: number;
};
