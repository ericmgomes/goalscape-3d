export type GoalscapeProject = {
  id: string;
  name: string;
};

export type ProjectListResponse = {
  selectedProject?: GoalscapeProject;
  projects: GoalscapeProject[];
};
