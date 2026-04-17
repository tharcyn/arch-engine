export interface TopologyEdge {
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly metadata?: Record<string, unknown>;
}
