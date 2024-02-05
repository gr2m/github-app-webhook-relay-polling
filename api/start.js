// @ts-check

import { getInstallationId } from "./get-installation-id.js";
import { startPolling } from "./poll.js";

/**
 * Before starting the webhook relay, verify the app credentials and
 * access to the given repository.
 *
 * After that start to listen to the relay's `webhook` event, and in
 * its handler, amend the body with the `installation` key and add
 * the signature to the event. Then inject the event into the passed
 * `app` instance and trigger the `webhook` event.
 *
 * Then start the relay.
 *
 * @param {import("../internal").State} state
 */
export default async function start(state) {
  let appSlug;
  let appEvents;

  try {
    const { data: appInfo, headers } = await state.app.octokit.request(
      "GET /app"
    );

    appSlug = appInfo.slug;
    appEvents = appInfo.events;

    // @ts-ignore - headers[date] is a string like "Mon, 29 Jan 2024 00:19:31 GMT"
    state.startTimeOnServer = new Date(headers["date"]).toISOString();
  } catch (error) {
    if (error.status === 404) {
      throw Object.assign(new Error(`Invalid app credentials`), {
        name: "GitHubAppWebHookRelayError",
      });
    }

    // @ts-ignore AggregateError is fine for Node 16+
    throw new AggregateError([error], "Could not retrieve app info");
  }

  if (state.owner) {
    state.installationId = await getInstallationId(state, String(appSlug));
    const octokit = await state.app.getInstallationOctokit(
      state.installationId
    );

    if (state.repo) {
      const { data: repo } = await octokit.request(
        "GET /repos/{owner}/{repo}",
        {
          owner: state.owner,
          repo: state.repo,
        }
      );
      state.repoId = repo.id;
    }
  }

  startPolling(state);

  state.eventEmitter.emit("start", {
    date: state.startTimeOnServer,
  });
}
