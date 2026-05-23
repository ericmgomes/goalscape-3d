export type GoalscapeGoal = {
  id?: string | number;
  goalId?: string | number;
  title?: string;
  name?: string;
  description?: string;
  progress?: number;
  importance?: number;
  weight?: number;
  size?: number;
  color?: string;
  colorIndex?: number;
  parentId?: string;
  parentGoalId?: string;
  children?: GoalscapeGoal[];
  subgoals?: GoalscapeGoal[];
  goals?: GoalscapeGoal[];
};
