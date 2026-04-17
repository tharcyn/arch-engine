export interface NodeMetadataChange {
  readonly nodeId: string;
  readonly beforeMetadata?: Record<string, unknown>;
  readonly afterMetadata?: Record<string, unknown>;
}

export interface EdgeMetadataChange {
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly beforeMetadata?: Record<string, unknown>;
  readonly afterMetadata?: Record<string, unknown>;
}

export interface TopologyMetadataDiff {
  readonly nodeMetadataChanges: readonly NodeMetadataChange[];
  readonly edgeMetadataChanges: readonly EdgeMetadataChange[];
}
