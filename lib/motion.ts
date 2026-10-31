import config from "@/project.config.json";

// Motion tokens from project.config.json. Only opacity and transform are animated, every duration is 400 ms or less,
// and MotionConfig makes everything instant when the OS "Reduce motion" setting is on.
const ms = config.motion.durationsMs;
export const duration = { fast: ms.fast / 1000, base: ms.base / 1000, slow: ms.slow / 1000 };
export const ease = config.motion.easing as [number, number, number, number];

export const pageEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.base, ease },
};
