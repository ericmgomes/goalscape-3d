export type SelectedProject = {
  id: string;
  name?: string;
};

export class ProjectSelectionService {
  private selectedProject?: SelectedProject;

  getSelectedProject(): SelectedProject | undefined {
    if (process.env.GOALSCAPE_PROJECT_ID) {
      return {
        id: process.env.GOALSCAPE_PROJECT_ID
      };
    }

    return this.selectedProject;
  }

  setSelectedProject(project: SelectedProject): SelectedProject {
    this.selectedProject = project;
    return project;
  }
}
