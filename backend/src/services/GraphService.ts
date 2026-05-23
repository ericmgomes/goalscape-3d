import type { GoalscapeReader } from './GoalscapeService.js';
import type { GoalGraph } from '../models/graph.js';
import { GoalscapeGraphTransformer } from '../transformers/GoalscapeGraphTransformer.js';

export class GraphService {
  constructor(
    private readonly goalscapeReader: GoalscapeReader,
    private readonly transformer = new GoalscapeGraphTransformer()
  ) {}

  async getGraph(): Promise<GoalGraph> {
    const goals = await this.goalscapeReader.fetchGoals();
    return this.transformer.transform(goals);
  }
}
