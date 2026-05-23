import type { GoalGraph } from '../models/graph';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly loginUrl?: string
  ) {
    super(message);
  }
}

export async function fetchGoalGraph(): Promise<GoalGraph> {
  const response = await fetch(`${API_BASE_URL}/api/graph`);

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new GraphApiError(
      details?.message ?? 'Unable to load Goalscape graph.',
      details?.error,
      details?.loginUrl ? `${API_BASE_URL}${details.loginUrl}` : undefined
    );
  }

  return response.json() as Promise<GoalGraph>;
}
