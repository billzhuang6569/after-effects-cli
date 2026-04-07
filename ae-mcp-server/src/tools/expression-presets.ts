import type { ApplyExpressionPresetInput } from "./schemas.js";

export const EXPRESSION_PRESETS: Record<ApplyExpressionPresetInput["preset"], string> = {
  wiggle_soft: "wiggle(2, 20)",
  wiggle_hard: "wiggle(8, 60)",
  loop_cycle_rotation: "loopOut('cycle')",
  loop_cycle_position: "loopOut('cycle')",
  elastic_scale_in:
    "e=2.718;n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--}if(n==0){t=0}else{t=time-key(n).time}v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=v/500;freq=3;decay=8;value+amp*Math.sin(freq*2*Math.PI*t)*Math.exp(-decay*t)",
  elastic_scale_out:
    "e=2.718;n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--}if(n==0){t=0}else{t=time-key(n).time}v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=v/500;freq=3;decay=6;value+amp*Math.sin(freq*2*Math.PI*t)*Math.exp(-decay*t)",
  inertia_position:
    "e=2.718;n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--}if(n==0){t=0}else{t=time-key(n).time}v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=v/100;freq=2.5;decay=5;value+amp*Math.sin(freq*2*Math.PI*t)*Math.exp(-decay*t)",
  inertia_rotation:
    "e=2.718;n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--}if(n==0){t=0}else{t=time-key(n).time}v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=v/10;freq=2.5;decay=5;value+amp*Math.sin(freq*2*Math.PI*t)*Math.exp(-decay*t)",
  flicker_opacity: "wiggle(15, 30)",
  bounce_position:
    "e=2.718;n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--}if(n==0){t=0}else{t=time-key(n).time}v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=v/80;freq=3;decay=7;value+amp*Math.abs(Math.sin(freq*Math.PI*t))*Math.exp(-decay*t)"
};
