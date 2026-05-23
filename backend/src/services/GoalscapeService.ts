import { McpClient, type McpToolResponse } from '../mcp/McpClient.js';
import type { GoalscapeGoal } from '../models/goalscape.js';
import type { ProjectSelectionService } from './ProjectSelectionService.js';

const DEFAULT_GOALSCAPE_TOOL = 'get-goal-tree';

export interface GoalscapeReader {
  fetchGoals(): Promise<GoalscapeGoal[]>;
}

export class GoalscapeService implements GoalscapeReader {
  constructor(
    private readonly mcpClient: McpClient,
    private readonly projectSelection?: ProjectSelectionService,
    private readonly toolName = process.env.GOALSCAPE_MCP_TOOL ?? DEFAULT_GOALSCAPE_TOOL
  ) {}

  async fetchGoals(): Promise<GoalscapeGoal[]> {
    const toolName = process.env.GOALSCAPE_MCP_TOOL ?? DEFAULT_GOALSCAPE_TOOL;
    const args = await this.resolveToolArgs(toolName);
    const response = await this.mcpClient.callTool<McpToolResponse>(toolName, args);
    const payload = this.extractPayload(response);
    const goals = this.normalizePayload(payload);

    if (!goals.length) {
      throw new Error('Goalscape MCP response did not contain any goals.');
    }

    return goals;
  }

  async listTools() {
    return this.mcpClient.listTools();
  }

  async listProjects(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.mcpClient.callTool<McpToolResponse>('list-projects');
    const payload = this.extractPayload(response);
    const projects = this.normalizeProjects(payload);

    if (!projects.length) {
      throw new Error('Goalscape MCP did not return any projects.');
    }

    return projects;
  }

  private async resolveToolArgs(toolName: string): Promise<Record<string, unknown>> {
    if (toolName !== 'get-goal-tree' && toolName !== 'get-project-overview') {
      return {};
    }

    return {
      projectId: await this.resolveProjectId()
    };
  }

  private async resolveProjectId(): Promise<string> {
    const selectedProject = this.projectSelection?.getSelectedProject();

    if (selectedProject) {
      return selectedProject.id;
    }

    const contextResponse = await this.mcpClient.callTool<McpToolResponse>('get-workspace-context');
    const contextPayload = this.extractPayload(contextResponse);
    const contextProjectId = this.findProjectId(contextPayload);

    if (contextProjectId) {
      return contextProjectId;
    }

    const projectsResponse = await this.mcpClient.callTool<McpToolResponse>('list-projects');
    const projectsPayload = this.extractPayload(projectsResponse);
    const projectId = this.findProjectId(projectsPayload);

    if (!projectId) {
      throw new Error('Could not resolve a Goalscape projectId. Open a project in Goalscape or set GOALSCAPE_PROJECT_ID in backend/.env.');
    }

    return projectId;
  }

  private extractPayload(response: McpToolResponse): unknown {
    const textContent = response.content?.find((item) => item.type === 'text' && item.text);

    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text);
      } catch {
        throw new Error(`Goalscape MCP returned non-JSON text: ${textContent.text}`);
      }
    }

    return response;
  }

  private normalizePayload(payload: unknown): GoalscapeGoal[] {
    if (Array.isArray(payload)) {
      return payload as GoalscapeGoal[];
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidate = payload as {
      goals?: GoalscapeGoal[];
      goalTree?: GoalscapeGoal[];
      project?: { goals?: GoalscapeGoal[]; rootGoal?: GoalscapeGoal; root?: GoalscapeGoal };
      root?: GoalscapeGoal;
      rootGoal?: GoalscapeGoal;
      data?: GoalscapeGoal[] | { goals?: GoalscapeGoal[]; root?: GoalscapeGoal };
    };

    if (Array.isArray(candidate.goals)) {
      return candidate.goals;
    }

    if (Array.isArray(candidate.goalTree)) {
      return candidate.goalTree;
    }

    if (candidate.project?.goals) {
      return candidate.project.goals;
    }

    if (candidate.project?.rootGoal) {
      return [candidate.project.rootGoal];
    }

    if (candidate.project?.root) {
      return [candidate.project.root];
    }

    if (candidate.root) {
      return [candidate.root];
    }

    if (candidate.rootGoal) {
      return [candidate.rootGoal];
    }

    if (Array.isArray(candidate.data)) {
      return candidate.data;
    }

    if (candidate.data && 'goals' in candidate.data && Array.isArray(candidate.data.goals)) {
      return candidate.data.goals;
    }

    if (candidate.data && 'root' in candidate.data && candidate.data.root) {
      return [candidate.data.root];
    }

    return [];
  }

  private findProjectId(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    if (Array.isArray(payload)) {
      return this.findProjectId(payload[0]);
    }

    const candidate = payload as Record<string, unknown>;
    const direct =
      candidate.projectId ??
      candidate.id ??
      candidate.currentProjectId ??
      candidate.openProjectId ??
      this.findProjectId(candidate.project) ??
      this.findProjectId(candidate.currentProject) ??
      this.findProjectId(candidate.openProject);

    if (typeof direct === 'string') {
      return direct;
    }

    if (Array.isArray(candidate.projects)) {
      return this.findProjectId(candidate.projects[0]);
    }

    if (Array.isArray(candidate.sessions)) {
      return this.findProjectId(candidate.sessions[0]);
    }

    if (Array.isArray(candidate.content)) {
      return undefined;
    }

    return undefined;
  }

  private normalizeProjects(payload: unknown): Array<{ id: string; name: string }> {
    const projectCandidates = this.findProjectArray(payload);

    return projectCandidates
      .map((project) => {
        const id = project.id ?? project.projectId;
        const name = project.name ?? project.title ?? 'Untitled project';

        if (typeof id !== 'string') {
          return undefined;
        }

        return {
          id,
          name: String(name)
        };
      })
      .filter((project): project is { id: string; name: string } => Boolean(project));
  }

  private findProjectArray(payload: unknown): Array<Record<string, unknown>> {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
    }

    const candidate = payload as Record<string, unknown>;

    if (Array.isArray(candidate.projects)) {
      return this.findProjectArray(candidate.projects);
    }

    if (candidate.data) {
      return this.findProjectArray(candidate.data);
    }

    return [];
  }
}
