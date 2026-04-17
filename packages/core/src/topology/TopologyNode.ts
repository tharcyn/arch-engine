export interface TopologyNode {
  readonly id: string;
  readonly type: string;
  readonly metadata?: Record<string, unknown>;
}
