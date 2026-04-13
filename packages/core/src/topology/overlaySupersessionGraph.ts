import { OverlayLifecycleState, setOverlayLifecycleState, getOverlayLifecycleState } from './overlayLifecycleState.js';

export interface SupersessionNode {
  currentOverlaySourceId: string;
  currentOverlayVersion: string;
  registryId: string;
  supersededBySourceId: string;
  supersededByVersion: string;
}

const supersessionRegistry: SupersessionNode[] = [];

export function registerOverlaySupersession(
  node: SupersessionNode
): void {
  // Prevent cycles: Check if supersededBy eventually resolves back to currentOverlaySourceId
  let currentId = node.supersededBySourceId;
  let currentVers = node.supersededByVersion;
  while (true) {
    if (currentId === node.currentOverlaySourceId && currentVers === node.currentOverlayVersion) {
      throw new Error(`Acyclic supersession sequence violated: Cycle detected between ${node.currentOverlaySourceId}@${node.currentOverlayVersion}`);
    }
    const nextNode = resolveSupersededOverlay(currentId, currentVers, node.registryId);
    if (!nextNode) break;
    currentId = nextNode.supersededBySourceId;
    currentVers = nextNode.supersededByVersion;
  }

  supersessionRegistry.push(node);

  // Automatically transition the active state if it was tracked.
  const current = getOverlayLifecycleState(node.currentOverlaySourceId, node.currentOverlayVersion, node.registryId);
  if (current) {
    setOverlayLifecycleState({
      ...current,
      lifecycleState: OverlayLifecycleState.SUPERSEDED,
      supersededBy: `${node.supersededBySourceId}@${node.supersededByVersion}`
    });
  } else {
    setOverlayLifecycleState({
      overlaySourceId: node.currentOverlaySourceId,
      overlayVersion: node.currentOverlayVersion,
      registryId: node.registryId,
      lifecycleState: OverlayLifecycleState.SUPERSEDED,
      supersededBy: `${node.supersededBySourceId}@${node.supersededByVersion}`
    });
  }
}

export function resolveSupersededOverlay(
  sourceId: string,
  version: string,
  registryId: string
): SupersessionNode | undefined {
  return supersessionRegistry.find(n => 
    n.currentOverlaySourceId === sourceId && 
    n.currentOverlayVersion === version && 
    n.registryId === registryId
  );
}

export function resolveSupersessionChain(
  sourceId: string,
  version: string,
  registryId: string
): SupersessionNode[] {
  const chain: SupersessionNode[] = [];
  let currentId = sourceId;
  let currentVers = version;
  
  while (true) {
    const node = resolveSupersededOverlay(currentId, currentVers, registryId);
    if (!node) break;
    
    // Prevent cycles
    if (chain.some(c => c.currentOverlaySourceId === node.supersededBySourceId && c.currentOverlayVersion === node.supersededByVersion)) {
        break;
    }
    
    chain.push(node);
    currentId = node.supersededBySourceId;
    currentVers = node.supersededByVersion;
  }
  return chain;
}
