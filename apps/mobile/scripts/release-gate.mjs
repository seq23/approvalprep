// Task 10's preview guard. The remaining store requirements are added by the release task.
export function assertPreviewOff(env = process.env) {
  if (env.EXPO_PUBLIC_AP_PREVIEW === '1') throw Error('NAMED STOP [PREVIEW_FLAG_SET] Remove the preview flag before a store build.');
}
if (process.argv[1]?.endsWith('/release-gate.mjs')) assertPreviewOff();
