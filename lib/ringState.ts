// Shared, mutable state that GSAP animates and the R3F render loop reads every frame.
// x / y are fractions of half the viewport (-1..1) so layout stays responsive.
export const ringState = {
  x: 0,
  y: 0,
  scale: 0.85,
  opacity: 1,
  tilt: 0.42,
  spin: 0,
  spinSpeed: 1.3,
  scrollRot: 0,
  dust: 0,
  // 0 = one ring, 1 = two interlocked rings
  split: 0,
  // 0 = follow x / y / scale, 1 = sit inside the page's "&" slot (ax / ay / anchorPx, in px)
  anchor: 0,
  ax: 0,
  ay: 0,
  anchorPx: 200,
  // 0 = rings travel as a linked pair, 1 = each ring sits in its own gap of the date
  dates: 0,
  d1x: 0,
  d1y: 0,
  d2x: 0,
  d2y: 0,
  dpx: 100,
};
