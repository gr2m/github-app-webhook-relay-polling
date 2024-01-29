// @ts-check

/**
 * @param {import("../internal").State} state
 */
export default async function stop(state) {
  state.isPolling = false;

  state.eventEmitter.emit("stop");
}
