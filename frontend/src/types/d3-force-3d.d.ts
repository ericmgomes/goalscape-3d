declare module 'd3-force-3d' {
  export type SimulationNodeDatum = {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  };

  export type SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> = {
    source: string | number | NodeDatum;
    target: string | number | NodeDatum;
    index?: number;
  };

  export type Simulation<NodeDatum extends SimulationNodeDatum> = {
    force(name: string, force: unknown): Simulation<NodeDatum>;
    stop(): Simulation<NodeDatum>;
    tick(iterations?: number): Simulation<NodeDatum>;
  };

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes: NodeDatum[],
    numDimensions?: number
  ): Simulation<NodeDatum>;

  export function forceCenter(x?: number, y?: number, z?: number): unknown;

  export function forceManyBody(): {
    strength(value: number): unknown;
  };

  export function forceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>(
    links: LinkDatum[]
  ): {
    id(value: (node: NodeDatum) => string): {
      distance(value: number): {
        strength(value: number): unknown;
      };
    };
  };
}
