import type { GoalscapeProject } from '../models/project';

type ProjectPickerProps = {
  status: 'loading' | 'syncing' | 'ready' | 'error';
  projects: GoalscapeProject[];
  selectedProject?: GoalscapeProject;
  error?: string;
  code?: string;
  loginUrl?: string;
  onSelectProject: (project: GoalscapeProject) => void;
};

export function ProjectPicker({
  status,
  projects,
  selectedProject,
  error,
  code,
  loginUrl,
  onSelectProject
}: ProjectPickerProps) {
  if (status === 'loading' || status === 'syncing') {
    return <div className="project-picker">{status === 'syncing' ? 'Opening project...' : 'Loading projects...'}</div>;
  }

  if (status === 'error') {
    return (
      <div className="project-picker">
        <span>{error}</span>
        {code === 'GOALSCAPE_AUTH_REQUIRED' && loginUrl ? (
          <a href={loginUrl} target="_blank" rel="noreferrer">
            Connect Goalscape
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <label className="project-picker">
      <span>Project</span>
      <select
        value={selectedProject?.id ?? ''}
        onChange={(event) => {
          const project = projects.find((candidate) => candidate.id === event.target.value);

          if (project) {
            onSelectProject(project);
          }
        }}
      >
        <option value="" disabled>
          Select a Goalscape project
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
