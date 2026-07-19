// Helper to calculate 3D Euclidean distance between two face landmarks
function getDistance(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 42 selected key landmarks covering face outline, eyes, brows, nose, and mouth contours
const KEY_LANDMARKS = [
  1,   // Nose tip (Center)
  10,  // Forehead top
  152, // Chin bottom
  33,  // Left eye outer corner
  133, // Left eye inner corner
  362, // Right eye inner corner
  263, // Right eye outer corner
  70,  // Left eyebrow outer
  105, // Left eyebrow inner
  334, // Right eyebrow inner
  300, // Right eyebrow outer
  0,   // Upper lip top
  17,  // Lower lip bottom
  61,  // Left mouth corner
  291, // Right mouth corner
  136, // Left jaw upper
  365, // Right jaw upper
  234, // Left cheek outer
  454, // Right cheek outer
  6,   // Nose bridge top
  4,   // Nose tip lower
  5,   // Nose bridge center
  45,  // Left temple
  275, // Right temple
  197, // Mid nasal ridge
  419, // Right mid temple
  13,  // Upper inner lip
  14,  // Lower inner lip
  82,  // Left upper lip ridge
  312, // Right upper lip ridge
  87,  // Left lower lip ridge
  317, // Right lower lip ridge
  78,  // Left lip corner inner
  308, // Right lip corner inner
  95,  // Left lower jaw contour
  324, // Right lower jaw contour
  191, // Left eye upper lid
  415, // Right eye upper lid
  80,  // Left eye lower lid
  310, // Right eye lower lid
  88,  // Left eyebrow center
  318  // Right eyebrow center
];

/**
 * Normalizes 468 MediaPipe FaceMesh landmarks into a stable 128-float biometric descriptor.
 * Relies on scale-invariant relative distances from the face center (nose tip).
 */
export function getFaceDescriptor(landmarks: any[]): number[] {
  if (!landmarks || landmarks.length < 468) {
    return Array.from({ length: 128 }, () => 0);
  }

  const center = landmarks[1]; // Nose tip as origin
  
  // Calculate face height as normalization scale
  const forehead = landmarks[10];
  const chin = landmarks[152];
  let scale = getDistance(forehead, chin);
  if (scale <= 0) scale = 1;

  const descriptor: number[] = [];

  // 1. Calculate normalized coordinates for the 42 key landmarks
  for (const index of KEY_LANDMARKS) {
    const p = landmarks[index];
    if (!p) {
      descriptor.push(0, 0, 0);
      continue;
    }
    // Transform coordinates relative to center, normalized by face scale
    descriptor.push(
      (p.x - center.x) / scale,
      (p.y - center.y) / scale,
      (p.z - center.z) / scale
    );
  }

  // Currently we have 42 * 3 = 126 elements. 
  // Let's add 2 face geometry ratios to reach exactly 128 elements.

  // Feature 127: Face width-to-height ratio (temple distance / face height)
  const leftTemple = landmarks[234];
  const rightTemple = landmarks[454];
  const faceWidth = getDistance(leftTemple, rightTemple);
  descriptor.push(faceWidth / scale);

  // Feature 128: Mouth aspect ratio (mouth vertical opening / mouth horizontal width)
  const topLip = landmarks[0];
  const bottomLip = landmarks[17];
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const mouthHeight = getDistance(topLip, bottomLip);
  const mouthWidth = getDistance(leftMouth, rightMouth);
  descriptor.push(mouthHeight / (mouthWidth || 1));

  // Double check length is exactly 128
  while (descriptor.length < 128) {
    descriptor.push(0);
  }
  if (descriptor.length > 128) {
    descriptor.splice(128);
  }

  return descriptor;
}
