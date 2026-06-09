"""
AR Load Validator - Computer Vision-based Cargo Volume Estimation
Uses OpenCV for object detection and 3D volume approximation from 2D images.
Classifies loads into vehicle categories.
"""
import base64
import io
import logging
import numpy as np
import cv2
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# Classification thresholds (approximate volume in cubic meters)
VOLUME_THRESHOLDS = {
    "2_wheeler": (0.1, 0.5),      # Bike/Scooter
    "3_wheeler": (0.5, 1.8),      # Auto-Rickshaw
    "tata_ace": (1.8, 5.0),       # Small truck
    "truck": (5.0, 15.0),         # Full size truck
}

# Bounding box aspect ratio constraints
ASPECT_RATIO_CONSTRAINTS = {
    "2_wheeler": (0.3, 2.0),      # Narrow to moderately wide
    "3_wheeler": (0.4, 2.5),      # More variation
    "tata_ace": (0.5, 3.0),       # Box shape
    "truck": (0.4, 4.0),          # Long vehicles
}


class LoadClassification(str, Enum):
    """Vehicle classification for load"""
    TWO_WHEELER = "2_wheeler"
    THREE_WHEELER = "3_wheeler"
    TATA_ACE = "tata_ace"
    TRUCK = "truck"


@dataclass
class VolumeEstimate:
    """Result of volume estimation"""
    estimated_volume_m3: float
    classification: str
    confidence: float
    bounding_box: Tuple[int, int, int, int]  # x, y, w, h
    detailed_measurements: Dict
    can_fit: Dict[str, bool]  # Whether load fits in each vehicle class


class LoadValidator:
    """
    Computer vision pipeline for cargo volume estimation.
    Uses contour detection, bounding boxes, and 3D approximation.
    """
    
    def __init__(self, reference_height_cm: float = 150.0):
        """
        Initialize validator with reference scale.
        reference_height_cm: Height of reference object in image (e.g., person = 170cm)
        """
        self.reference_height_cm = reference_height_cm
        self.reference_pixels = None  # Will be set based on detected object
    
    def estimate_volume_from_base64(self, image_base64: str) -> VolumeEstimate:
        """
        Decode base64 image and estimate cargo volume.
        
        Args:
            image_base64: Base64 encoded image string
        
        Returns:
            VolumeEstimate object with classification and metrics
        """
        try:
            # Decode base64
            image_data = base64.b64decode(image_base64)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            return self.estimate_volume_from_cv2(image)
        
        except Exception as e:
            logger.error(f"Error processing base64 image: {e}")
            raise
    
    def estimate_volume_from_cv2(self, image: np.ndarray) -> VolumeEstimate:
        """
        Estimate cargo volume from OpenCV image array.
        Performs object detection, bounding box analysis, and 3D approximation.
        """
        # Preprocessing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Object detection using edge detection + contours
        edges = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            logger.warning("No objects detected in image")
            return VolumeEstimate(
                estimated_volume_m3=0.0,
                classification="unknown",
                confidence=0.0,
                bounding_box=(0, 0, 0, 0),
                detailed_measurements={},
                can_fit={k: False for k in VOLUME_THRESHOLDS.keys()},
            )
        
        # Get largest contour (primary object)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Calculate measurements
        measurements = self._calculate_measurements(image, largest_contour, x, y, w, h)
        
        # Estimate 3D volume from 2D measurements
        estimated_volume = self._estimate_3d_volume(measurements)
        
        # Classify and calculate confidence
        classification, confidence = self._classify_load(estimated_volume, measurements)
        
        # Check vehicle fit
        can_fit = {
            vehicle_class: VOLUME_THRESHOLDS[vehicle_class][0] <= estimated_volume <= VOLUME_THRESHOLDS[vehicle_class][1]
            for vehicle_class in VOLUME_THRESHOLDS.keys()
        }
        
        logger.info(
            f"Volume estimation: {estimated_volume:.2f}m³, "
            f"Classification: {classification}, Confidence: {confidence:.2f}"
        )
        
        return VolumeEstimate(
            estimated_volume_m3=estimated_volume,
            classification=classification,
            confidence=confidence,
            bounding_box=(x, y, w, h),
            detailed_measurements=measurements,
            can_fit=can_fit,
        )
    
    def _calculate_measurements(
        self,
        image: np.ndarray,
        contour: np.ndarray,
        x: int,
        y: int,
        w: int,
        h: int
    ) -> Dict:
        """
        Extract detailed measurements from bounding box and contour.
        """
        # Bounding box metrics
        area_pixels = w * h
        aspect_ratio = w / h if h > 0 else 0
        
        # Contour metrics
        contour_area = cv2.contourArea(contour)
        contour_perimeter = cv2.arcLength(contour, True)
        
        # Approximate circularity (0 = line, 1 = circle)
        circularity = 4 * np.pi * contour_area / (contour_perimeter ** 2) if contour_perimeter > 0 else 0
        
        # Fit ellipse for orientation
        if len(contour) >= 5:
            ellipse = cv2.fitEllipse(contour)
            major_axis, minor_axis = ellipse[1]
            orientation = ellipse[2]
        else:
            major_axis, minor_axis = w, h
            orientation = 0
        
        # Compactness score (how "filled" the bounding box is)
        compactness = contour_area / area_pixels if area_pixels > 0 else 0
        
        return {
            "bbox_width_px": w,
            "bbox_height_px": h,
            "bbox_area_px": area_pixels,
            "aspect_ratio": aspect_ratio,
            "contour_area_px": contour_area,
            "contour_perimeter_px": contour_perimeter,
            "circularity": circularity,
            "major_axis_px": major_axis,
            "minor_axis_px": minor_axis,
            "orientation_degrees": orientation,
            "compactness": compactness,
        }
    
    def _estimate_3d_volume(self, measurements: Dict) -> float:
        """
        Estimate 3D volume from 2D image measurements.
        Uses heuristic: volume ≈ (width * height * depth_estimate) / scaling_factor
        
        Assumes:
        - Standard camera angle (45° from horizontal)
        - Depth is estimated as ~60% of width/height average
        - Scaling: 1 meter ≈ 200 pixels in typical setup
        """
        bbox_width_px = measurements["bbox_width_px"]
        bbox_height_px = measurements["bbox_height_px"]
        compactness = measurements["compactness"]
        
        # Estimate depth from width (assume roughly cube-like)
        estimated_depth_px = bbox_width_px * 0.7
        
        # Volume in "pixel units"
        volume_pixel_units = bbox_width_px * bbox_height_px * estimated_depth_px
        
        # Apply compactness factor (sparse objects have lower volume)
        volume_pixel_units *= compactness
        
        # Convert to cubic meters
        # Scaling: typical 1m = 200px, so 1m³ = 200³ px³ = 8,000,000 px³
        pixels_per_meter = 200
        volume_m3 = volume_pixel_units / (pixels_per_meter ** 3)
        
        # Cap volume (prevent unrealistic estimates)
        volume_m3 = max(0.1, min(volume_m3, 20.0))
        
        return volume_m3
    
    def _classify_load(self, volume: float, measurements: Dict) -> Tuple[str, float]:
        """
        Classify load into vehicle category based on volume and shape.
        Returns: (classification, confidence_score)
        """
        aspect_ratio = measurements["aspect_ratio"]
        compactness = measurements["compactness"]
        circularity = measurements["circularity"]
        
        confidence_scores = {}
        
        for vehicle_class, (vol_min, vol_max) in VOLUME_THRESHOLDS.items():
            # Volume score (1.0 if perfectly in range, lower if outside)
            if vol_min <= volume <= vol_max:
                volume_score = 1.0
            elif volume < vol_min:
                volume_score = max(0.0, 1.0 - (vol_min - volume) / vol_min)
            else:
                volume_score = max(0.0, 1.0 - (volume - vol_max) / vol_max)
            
            # Aspect ratio score
            ratio_min, ratio_max = ASPECT_RATIO_CONSTRAINTS[vehicle_class]
            if ratio_min <= aspect_ratio <= ratio_max:
                aspect_score = 1.0
            else:
                aspect_score = max(0.0, 1.0 - abs(aspect_ratio - (ratio_min + ratio_max) / 2) / 2)
            
            # Combined confidence
            confidence = (volume_score * 0.7 + aspect_score * 0.3)
            confidence_scores[vehicle_class] = confidence
        
        # Select classification with highest confidence
        classification = max(confidence_scores, key=confidence_scores.get)
        confidence = confidence_scores[classification]
        
        return classification, confidence


def validate_load_volume(
    image_base64: str,
    reference_height_cm: float = 150.0
) -> Dict:
    """
    High-level function for load volume validation.
    
    Args:
        image_base64: Base64 encoded image of cargo
        reference_height_cm: Reference object height for scaling (e.g., 170 for person)
    
    Returns:
        Dictionary with volume estimate, classification, and fitness for each vehicle
    """
    validator = LoadValidator(reference_height_cm=reference_height_cm)
    estimate = validator.estimate_volume_from_base64(image_base64)
    
    return {
        "estimated_volume_m3": estimate.estimated_volume_m3,
        "classification": estimate.classification,
        "confidence": estimate.confidence,
        "bounding_box": {
            "x": estimate.bounding_box[0],
            "y": estimate.bounding_box[1],
            "width": estimate.bounding_box[2],
            "height": estimate.bounding_box[3],
        },
        "detailed_measurements": estimate.detailed_measurements,
        "vehicle_fit": estimate.can_fit,
        "recommended_vehicle": estimate.classification,
    }


def batch_validate_volumes(
    images_base64: List[str],
    reference_height_cm: float = 150.0
) -> List[Dict]:
    """
    Validate multiple images in batch.
    """
    results = []
    for image_b64 in images_base64:
        try:
            result = validate_load_volume(image_b64, reference_height_cm)
            results.append(result)
        except Exception as e:
            logger.error(f"Error validating image: {e}")
            results.append({
                "error": str(e),
                "estimated_volume_m3": 0.0,
                "classification": "unknown",
                "confidence": 0.0,
            })
    
    return results
