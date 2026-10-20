/** No click on hidden templates, inactive controls, or off-screen UI. */
export function isActionable(element: HTMLElement): boolean {
  if (!element.isConnected || element.matches(':disabled') ||
      element.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]')) return false;
  if (typeof element.checkVisibility === 'function' &&
      !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
  // checkVisibility is unavailable in some test DOMs; ancestor opacity still matters.
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' ||
        style.visibility === 'collapse' || style.opacity === '0') return false;
  }
  if (getComputedStyle(element).pointerEvents === 'none') return false;
  return Array.from(element.getClientRects()).some((rect) =>
    rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
    rect.top < innerHeight && rect.left < innerWidth);
}
