export type FaceBox = { originX: number; originY: number; width: number; height: number };
type Rect = { left: number; top: number; width: number; height: number };

/** Project the mirrored object-cover video onto the actual guide on screen. */
export function isFaceInsideGuide(box: FaceBox, videoWidth: number, videoHeight: number, viewport: Rect, guide: Rect): boolean {
  if (videoWidth <= 0 || videoHeight <= 0 || viewport.width <= 0 || viewport.height <= 0 || guide.width <= 0 || guide.height <= 0 || box.width <= 0 || box.height <= 0) return false;
  const scale = Math.max(viewport.width / videoWidth, viewport.height / videoHeight);
  const offsetX = (viewport.width - videoWidth * scale) / 2;
  const offsetY = (viewport.height - videoHeight * scale) / 2;
  const left = viewport.left + offsetX + (videoWidth - box.originX - box.width) * scale;
  const top = viewport.top + offsetY + box.originY * scale;
  return left >= Math.max(guide.left, viewport.left) && top >= Math.max(guide.top, viewport.top)
    && left + box.width * scale <= Math.min(guide.left + guide.width, viewport.left + viewport.width)
    && top + box.height * scale <= Math.min(guide.top + guide.height, viewport.top + viewport.height);
}
