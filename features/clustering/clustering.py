"""
Sahiyatri Pooling Algorithm
Intelligently cluster loads based on proximity, trajectory, and volume constraints.
Uses DBSCAN and custom geospatial logic for optimal route pooling.
"""
import logging
from typing import List, Dict, Tuple
from dataclasses import dataclass
import math
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Vehicle capacity constraints (in cubic meters)
VEHICLE_LIMITS = {
    "2_wheeler": 0.3,      # Bike/Scooter
    "3_wheeler": 1.5,      # Auto-Rickshaw
    "tata_ace": 4.5,       # Small truck
    "truck": 10.0,         # Full size truck
}

# Geospatial parameters
EARTH_RADIUS_KM = 6371
EPSILON_KM = 2.0  # Max distance between loads in cluster (2km)
MIN_CLUSTER_SIZE = 2  # Minimum loads per pool


@dataclass
class Load:
    """Represents a load/shipment"""
    load_id: str
    pickup_lat: float
    pickup_lon: float
    dropoff_lat: float
    dropoff_lon: float
    required_volume: float
    priority: bool
    bid_amount: float
    
    def haversine_distance(self, other: 'Load', use_dropoff: bool = False) -> float:
        """
        Calculate great-circle distance between two loads.
        use_dropoff: If True, measure dropoff distance; otherwise pickup.
        """
        if use_dropoff:
            lat1, lon1 = math.radians(self.dropoff_lat), math.radians(self.dropoff_lon)
            lat2, lon2 = math.radians(other.dropoff_lat), math.radians(other.dropoff_lon)
        else:
            lat1, lon1 = math.radians(self.pickup_lat), math.radians(self.pickup_lon)
            lat2, lon2 = math.radians(other.pickup_lat), math.radians(other.pickup_lon)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return EARTH_RADIUS_KM * c
    
    def trajectory_alignment(self, other: 'Load') -> float:
        """
        Calculate trajectory alignment score (0-1).
        Higher score indicates similar pickup-to-dropoff paths.
        """
        # Vector from pickup to dropoff for both loads
        v1_lat = self.dropoff_lat - self.pickup_lat
        v1_lon = self.dropoff_lon - self.pickup_lon
        
        v2_lat = other.dropoff_lat - other.pickup_lat
        v2_lon = other.dropoff_lon - other.pickup_lon
        
        # Magnitude
        mag1 = math.sqrt(v1_lat ** 2 + v1_lon ** 2)
        mag2 = math.sqrt(v2_lat ** 2 + v2_lon ** 2)
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        # Cosine similarity (dot product / magnitudes)
        dot_product = v1_lat * v2_lat + v1_lon * v2_lon
        cos_similarity = dot_product / (mag1 * mag2)
        
        # Clamp to [0, 1]
        return max(0.0, min(1.0, cos_similarity))


class LoadPooler:
    """
    Clusters loads using geospatial + volume constraints.
    Optimizes for minimal driver overhead and maximum capacity utilization.
    """
    
    def __init__(self, max_vehicle_volume: float = VEHICLE_LIMITS["tata_ace"]):
        self.max_vehicle_volume = max_vehicle_volume
        self.epsilon_km = EPSILON_KM
        self.min_cluster_size = MIN_CLUSTER_SIZE
    
    def cluster_loads(
        self,
        pending_loads: List[Dict],
        vehicle_class: str = "tata_ace"
    ) -> List[List[str]]:
        """
        Cluster loads into optimal pools for vehicle dispatch.
        
        Args:
            pending_loads: List of load dicts with geospatial and volume info
            vehicle_class: Vehicle type determining max capacity
        
        Returns:
            List of load_id clusters (each cluster is a list of load IDs)
        """
        if not pending_loads:
            return []
        
        # Set vehicle capacity
        self.max_vehicle_volume = VEHICLE_LIMITS.get(vehicle_class, VEHICLE_LIMITS["tata_ace"])
        
        # Convert to Load objects
        loads = [
            Load(
                load_id=l["load_id"],
                pickup_lat=l["pickup_latitude"],
                pickup_lon=l["pickup_longitude"],
                dropoff_lat=l["dropoff_latitude"],
                dropoff_lon=l["dropoff_longitude"],
                required_volume=l["required_volume"],
                priority=l.get("priority", False),
                bid_amount=l.get("bid_amount", 0),
            )
            for l in pending_loads
        ]
        
        # Build distance matrix for clustering
        n = len(loads)
        distance_matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(i + 1, n):
                # Combine pickup proximity and trajectory alignment
                pickup_dist = loads[i].haversine_distance(loads[j], use_dropoff=False)
                trajectory_score = loads[i].trajectory_alignment(loads[j])
                
                # Weight: prioritize proximity but reward trajectory alignment
                # Clamp to 0.0 — DBSCAN precomputed metric requires non-negative values
                distance = max(0.0, pickup_dist - (trajectory_score * 0.5))
                distance_matrix[i, j] = distance
                distance_matrix[j, i] = distance
        
        # Apply DBSCAN clustering
        clustering = DBSCAN(
            eps=self.epsilon_km,
            min_samples=self.min_cluster_size,
            metric="precomputed"
        ).fit(distance_matrix)
        
        labels = clustering.labels_
        
        # Group loads by cluster
        clusters_dict = {}
        for idx, label in enumerate(labels):
            if label == -1:  # Noise point (unclustered)
                clusters_dict[f"single_{idx}"] = [loads[idx].load_id]
            else:
                if label not in clusters_dict:
                    clusters_dict[label] = []
                clusters_dict[label].append(loads[idx].load_id)
        
        # Filter clusters by volume constraint
        valid_clusters = []
        for cluster_id, load_ids in clusters_dict.items():
            # Get loads in cluster
            cluster_loads = [l for l in loads if l.load_id in load_ids]
            total_volume = sum(l.required_volume for l in cluster_loads)
            
            if total_volume <= self.max_vehicle_volume:
                # Sort by priority (high priority first) and bid amount (lower first)
                cluster_loads.sort(
                    key=lambda l: (not l.priority, l.bid_amount),
                    reverse=False
                )
                valid_clusters.append([l.load_id for l in cluster_loads])
                logger.info(
                    f"Cluster created: {len(load_ids)} loads, "
                    f"volume: {total_volume:.2f}/{self.max_vehicle_volume:.2f}m³"
                )
            else:
                # Cluster exceeds volume, split recursively
                logger.warning(
                    f"Cluster volume ({total_volume:.2f}m³) exceeds limit. Splitting..."
                )
                split = self._split_by_volume(cluster_loads)
                valid_clusters.extend(split)
        
        return valid_clusters
    
    def _split_by_volume(self, loads: List[Load]) -> List[List[str]]:
        """
        Recursively split loads that exceed volume limit.
        Uses greedy bin-packing algorithm.
        """
        # Sort by volume descending (largest first)
        sorted_loads = sorted(loads, key=lambda l: l.required_volume, reverse=True)
        
        bins = []
        bin_volumes = []
        
        for load in sorted_loads:
            # Find first bin with space
            placed = False
            for i, (bin_list, volume) in enumerate(zip(bins, bin_volumes)):
                if volume + load.required_volume <= self.max_vehicle_volume:
                    bin_list.append(load.load_id)
                    bin_volumes[i] += load.required_volume
                    placed = True
                    break
            
            # Create new bin if needed
            if not placed:
                bins.append([load.load_id])
                bin_volumes.append(load.required_volume)
        
        return bins
    
    def estimate_pooling_metrics(
        self,
        clusters: List[List[str]],
        loads_dict: Dict[str, Dict]
    ) -> Dict:
        """
        Calculate pooling efficiency metrics.
        Returns utilization rate and estimated savings.
        """
        total_volume = 0
        total_bids = 0
        num_clusters = len(clusters)
        
        for cluster in clusters:
            for load_id in cluster:
                if load_id in loads_dict:
                    load = loads_dict[load_id]
                    total_volume += load.get("required_volume", 0)
                    total_bids += load.get("bid_amount", 0)
        
        avg_utilization = (total_volume / (num_clusters * self.max_vehicle_volume)) * 100 if num_clusters > 0 else 0
        
        return {
            "num_clusters": num_clusters,
            "total_volume": total_volume,
            "max_capacity": num_clusters * self.max_vehicle_volume,
            "utilization_percentage": avg_utilization,
            "total_revenue": total_bids,
            "avg_bids_per_pool": total_bids / num_clusters if num_clusters > 0 else 0,
        }


def cluster_loads(
    pending_loads: List[Dict],
    vehicle_class: str = "tata_ace"
) -> List[List[str]]:
    """
    High-level function to cluster loads for pooling.
    
    Expected load dict structure:
    {
        "load_id": "uuid",
        "pickup_latitude": 40.7128,
        "pickup_longitude": -74.0060,
        "dropoff_latitude": 40.7580,
        "dropoff_longitude": -73.9855,
        "required_volume": 2.5,
        "priority": False,
        "bid_amount": 450.00
    }
    """
    pooler = LoadPooler(max_vehicle_volume=VEHICLE_LIMITS.get(vehicle_class, VEHICLE_LIMITS["tata_ace"]))
    return pooler.cluster_loads(pending_loads, vehicle_class)
