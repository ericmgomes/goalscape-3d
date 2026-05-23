import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraphStatus } from './GraphStatus';

describe('GraphStatus', () => {
  it('shows loading state', () => {
    render(<GraphStatus status="loading" />);

    expect(screen.getByText('Loading Goalscape graph...')).toBeInTheDocument();
  });

  it('shows empty state for a ready graph with no nodes', () => {
    render(<GraphStatus status="ready" graph={{ nodes: [], edges: [] }} />);

    expect(screen.getByText('No goals found.')).toBeInTheDocument();
  });

  it('shows API errors', () => {
    render(<GraphStatus status="error" error="MCP server is offline." />);

    expect(screen.getByText('MCP server is offline.')).toBeInTheDocument();
  });

  it('shows a connect link when Goalscape authentication is required', () => {
    render(
      <GraphStatus
        status="error"
        error="Connect Goalscape before loading graph data."
        code="GOALSCAPE_AUTH_REQUIRED"
        loginUrl="http://localhost:4000/auth/login"
      />
    );

    expect(screen.getByRole('link', { name: 'Connect Goalscape' })).toHaveAttribute(
      'href',
      'http://localhost:4000/auth/login'
    );
  });
});
