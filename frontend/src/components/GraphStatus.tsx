import type { GoalGraph } from '../models/graph';

type GraphStatusProps = {
  status: 'loading' | 'ready' | 'error';
  graph?: GoalGraph;
  error?: string;
  code?: string;
  loginUrl?: string;
};

export function GraphStatus({ status, graph, error, code, loginUrl }: GraphStatusProps) {
  if (status === 'loading') {
    return <div className="status-panel">Loading Goalscape graph...</div>;
  }

  if (status === 'error') {
    return (
      <div className="status-panel status-panel-error">
        <p>{error}</p>
        {code === 'GOALSCAPE_AUTH_REQUIRED' && loginUrl ? (
          <a className="connect-button" href={loginUrl} target="_blank" rel="noreferrer">
            Connect Goalscape
          </a>
        ) : null}
      </div>
    );
  }

  if (!graph?.nodes.length) {
    return <div className="status-panel">No goals found.</div>;
  }

  return null;
}
