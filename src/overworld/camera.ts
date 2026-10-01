/**
 * Camera placement, kept free of Pixi so it can be reasoned about and tested on
 * its own.
 *
 * The overworld camera used to keep the player pinned to the middle of the screen
 * unconditionally, which only makes sense for a map bigger than the viewport. On
 * a small map it slides the world off to one side instead: the apartment rendered
 * with ~480px of black to its left, and the casino floor started at y=340 with
 * the top-left third empty and the bottom-right clipped off the screen.
 */

/**
 * Where the world sits along one axis, in screen pixels.
 *
 * A map that fits in the viewport is centred in it and does not scroll at all.
 * A map that does not fit follows the player, clamped so the camera never travels
 * past either edge of the map and shows ground that isn't there.
 *
 * @param viewport   the screen's extent along this axis
 * @param world      the map's extent along this axis, already scaled
 * @param playerMid  the player's centre within the world, already scaled
 */
export function cameraOffset(viewport: number, world: number, playerMid: number): number {
  if (world <= viewport) return (viewport - world) / 2
  const followingPlayer = viewport / 2 - playerMid
  return Math.max(viewport - world, Math.min(0, followingPlayer))
}
