export interface LocalPolicyRule {
  readonly type: "forbid-edge";
  readonly from: string;
  readonly to: string;
}
