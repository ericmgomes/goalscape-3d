import { useEffect, useState } from 'react';
import type { GoalscapeProject, ProjectListResponse } from '../models/project';
import { fetchProjects, selectProject } from '../services/projectApi';
import { GraphApiError } from '../services/graphApi';

type ProjectState =
  | { status: 'loading'; projects: []; selectedProject?: undefined; error?: undefined; code?: undefined; loginUrl?: undefined }
  | { status: 'syncing'; projects: GoalscapeProject[]; selectedProject?: GoalscapeProject; error?: undefined; code?: undefined; loginUrl?: undefined }
  | { status: 'ready'; projects: GoalscapeProject[]; selectedProject?: GoalscapeProject; error?: undefined; code?: undefined; loginUrl?: undefined }
  | { status: 'error'; projects: []; selectedProject?: undefined; error: string; code?: string; loginUrl?: string };

export function useProjects() {
  const projectIdFromUrl = new URLSearchParams(window.location.search).get('project');
  const [state, setState] = useState<ProjectState>(
    projectIdFromUrl
      ? {
          status: 'syncing',
          projects: [],
          selectedProject: {
            id: projectIdFromUrl,
            name: 'Selected project'
          }
        }
      : { status: 'loading', projects: [] }
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const projectIdFromUrl = new URLSearchParams(window.location.search).get('project');

    if (projectIdFromUrl) {
      const selectedProject = {
        id: projectIdFromUrl,
        name: 'Selected project'
      };

      selectProject(selectedProject.id, selectedProject.name)
        .then(() => {
          if (isMounted) {
            setState({
              status: 'ready',
              projects: [selectedProject],
              selectedProject
            });
          }
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setState({
              status: 'error',
              projects: [],
              error: error instanceof Error ? error.message : 'Unable to select Goalscape project.'
            });
          }
        });

      return () => {
        isMounted = false;
      };
    }

    fetchProjects()
      .then((response: ProjectListResponse) => {
        if (isMounted) {
          setState({
            status: 'ready',
            projects: response.projects,
            selectedProject: response.selectedProject
          });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            status: 'error',
            projects: [],
            error: error instanceof Error ? error.message : 'Unable to load Goalscape projects.',
            code: error instanceof GraphApiError ? error.code : undefined,
            loginUrl: error instanceof GraphApiError ? error.loginUrl : undefined
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [revision]);

  async function chooseProject(project: GoalscapeProject) {
    await selectProject(project.id, project.name);
    persistProjectInUrl(project.id);
    setState((current) => ({
      status: 'ready',
      projects: current.projects,
      selectedProject: project
    }));
    setRevision((current) => current + 1);
  }

  return {
    ...state,
    chooseProject,
    reloadProjects: () => setRevision((current) => current + 1)
  };
}

function persistProjectInUrl(projectId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('project', projectId);
  window.history.replaceState({}, '', url);
}
