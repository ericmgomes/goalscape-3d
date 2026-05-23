import { useEffect, useState } from 'react';
import type { GoalGraph } from '../models/graph';
import { fetchGoalGraph, GraphApiError } from '../services/graphApi';

type GoalGraphState =
  | { status: 'loading'; graph?: undefined; error?: undefined }
  | { status: 'ready'; graph: GoalGraph; error?: undefined }
  | { status: 'error'; graph?: undefined; error: string; code?: string; loginUrl?: string };

export function useGoalGraph(projectId?: string): GoalGraphState {
  const [state, setState] = useState<GoalGraphState>({ status: 'loading' });

  useEffect(() => {
    if (!projectId) {
      setState({
        status: 'error',
        error: 'Select a Goalscape project before loading graph data.'
      });
      return;
    }

    let isMounted = true;

    fetchGoalGraph()
      .then((graph) => {
        if (isMounted) {
          setState({ status: 'ready', graph });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to load Goalscape graph.',
            code: error instanceof GraphApiError ? error.code : undefined,
            loginUrl: error instanceof GraphApiError ? error.loginUrl : undefined
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return state;
}
