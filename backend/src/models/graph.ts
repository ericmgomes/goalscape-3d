export class GoalNode {
  constructor(
    public id: string,
    public title: string,
    public description?: string,
    public progress?: number,
    public level?: number,
    public parentId?: string,
    public color?: string,
    public size?: number
  ) {}
}

export class GoalEdge {
  constructor(
    public source: string,
    public target: string,
    public type: 'parent-child' = 'parent-child'
  ) {}
}

export type GoalGraph = {
  nodes: GoalNode[];
  edges: GoalEdge[];
};
