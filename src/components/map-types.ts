interface BaseItemForCombining {
  id: string;
  name: string;
  location: { latitude: number; longitude: number; }; // Ensure location is non-optional here
}

export interface WorkerLocation extends BaseItemForCombining {
  type: 'worker'; // Add type discriminant here
  avatar?: string;
  lastSeen?: string;
  address?: string;
}

export interface ProjectLocation extends BaseItemForCombining {
  type: 'project'; // Add type discriminant here
  color?: string;
  lastModified: string;
  address?: string;
}

// Discriminant union for items *within* a cluster or as a single marker
export type ItemInCluster = WorkerLocation | ProjectLocation;


// The type for a single, non-clustered marker
export type SingleRenderableMarker = ItemInCluster & {
  isCluster: false;
};

// The type for a clustered marker
export interface ClusterRenderableMarker {
  id: string; // Unique ID for the cluster
  clusterId: number; // The original cluster ID from supercluster
  isCluster: true;
  location: { latitude: number; longitude: number; }; // The original location of the cluster
  count: number;
  items: ItemInCluster[]; // All items in this cluster
}

// The union of all possible markers rendered on the map
export type RenderableMarkerInfo = SingleRenderableMarker | ClusterRenderableMarker;
