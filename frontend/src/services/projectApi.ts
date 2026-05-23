import type { ProjectListResponse } from '../models/project';
import { GraphApiError } from './graphApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

export async function fetchProjects(): Promise<ProjectListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects`);

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new GraphApiError(
      details?.message ?? 'Unable to load Goalscape projects.',
      details?.error,
      details?.loginUrl ? `${API_BASE_URL}${details.loginUrl}` : undefined
    );
  }

  return response.json() as Promise<ProjectListResponse>;
}

export async function selectProject(projectId: string, name: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projects/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ projectId, name })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new Error(details?.message ?? 'Unable to select Goalscape project.');
  }
}
