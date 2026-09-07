export type FaceBox = { originX: number; originY: number; width: number; height: number };
type Rect = { left: number; top: number; width: number; height: number };

/** Project the mirrored object-cover video onto the guide, allowing detector jitter at its edges. */
export function isFaceInsideGuide(box: FaceBox, videoWidth: number, videoHeight: number, viewport: Rect, guide: Rect): boolean {
  if (videoWidth <= 0 || videoHeight <= 0 || viewport.width <= 0 || viewport.height <= 0 || guide.width <= 0 || guide.height <= 0 || box.width <= 0 || box.height <= 0) return false;
  const scale = Math.max(viewport.width / videoWidth, viewport.height / videoHeight);
  const offsetX = (viewport.width - videoWidth * scale) / 2;
  const offsetY = (viewport.height - videoHeight * scale) / 2;
  const left = viewport.left + offsetX + (videoWidth - box.originX - box.width) * scale;
  const top = viewport.top + offsetY + box.originY * scale;
  const right = left + box.width * scale;
  const bottom = top + box.height * scale;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  // The face remains centered in the real guide. Its detection box may extend
  // slightly beyond the dashed border, but never beyond the visible video.
  const toleranceX = guide.width * 0.1;
  const toleranceY = guide.height * 0.1;
  return centerX >= guide.left && centerX <= guide.left + guide.width
    && centerY >= guide.top && centerY <= guide.top + guide.height
    && left >= Math.max(guide.left - toleranceX, viewport.left)
    && top >= Math.max(guide.top - toleranceY, viewport.top)
    && right <= Math.min(guide.left + guide.width + toleranceX, viewport.left + viewport.width)
    && bottom <= Math.min(guide.top + guide.height + toleranceY, viewport.top + viewport.height);
}
