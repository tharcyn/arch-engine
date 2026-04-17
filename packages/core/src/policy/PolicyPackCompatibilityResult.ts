export interface PolicyPackCompatibilityResult {
  readonly compatible: boolean;
  readonly expectedVersion?: string;
  readonly actualVersion: string;
}
