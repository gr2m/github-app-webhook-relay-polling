// @ts-check

/**
 *
 * @param {import("../internal").State} state
 */
export async function startPolling(state) {
  if (!state.isPolling) return;

  const {
    data: deliveries,
    headers: { etag },
  } = await state.app.octokit
    .request("GET /app/hook/deliveries", {
      per_page: 100,
      headers: {
        "if-none-match": `"${state.lastPollEtag}"`,
      },
    })
    .catch((error) => {
      if (error.status !== 304) throw error;

      return { data: [], headers: { etag: state.lastPollEtag } };
    });

  state.lastPollEtag = etag;

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (state.sinceId) {
      if (delivery.id <= state.sinceId) {
        return false;
      }
    }

    if (delivery.delivered_at < String(state.startTimeOnServer)) {
      return false;
    }

    if (!state.owner) {
      return true;
    }

    if (delivery.installation_id !== state.installationId) {
      return false;
    }

    if (!state.repo) {
      return true;
    }

    return delivery.repository_id === state.repoId;
  });

  for (const delivery of filteredDeliveries) {
    // get payload
    const { data } = await state.app.octokit.request(
      "GET /app/hook/deliveries/{delivery_id}",
      {
        delivery_id: delivery.id,
      }
    );

    const webhookEvent = {
      id: delivery.guid,
      name: delivery.event,
      payload: data.request.payload,
    };

    if (!state.isPolling) return;

    state.eventEmitter.emit("webhook", webhookEvent);

    await state.app.webhooks.receive(webhookEvent);
  }

  if (deliveries[0]) {
    state.sinceId = deliveries[0].id;
  }

  // wait for a second, then poll again
  setTimeout(() => startPolling(state), 1000);
}
