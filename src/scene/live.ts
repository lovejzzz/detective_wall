// Where each note actually is on screen right now, frame by frame, while it glides between the
// wall and the timeline (or is carried). The page's labels, ribbons and tabs read from here so they
// travel with their note instead of waiting for it to arrive. World coordinates, y down.
export interface LivePose {
  x: number;
  y: number;
  rotation: number;
}

export const livePose = new Map<string, LivePose>();
