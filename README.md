# `github-app-webhook-relay-polling`

> Receive webhooks from a GitHub app via polling

`github-app-webhook-relay-polling` is an alternative to [`github-app-webhook-relay`](https://github.com/gr2m/github-app-webhook-relay/#readme) which relies on a beta features and does not support all webhook types, such as `installation` or events for repositories that were created after testing started.

## Usage

Webhooks are injected into the passed `app` instance automatically and can be handled using `app.webhooks.on(eventName, handler)`

```js
import { App } from "octokit";
import AppWebhookRelay from "github-app-webhook-relay-polling";

const app = new App({
  appId: process.env.APP_ID,
  privateKey: process.env.APP_PRIVATE_KEY,
  webhooks: {
    // value does not matter, but has to be set.
    secret: "secret",
  },
});

app.webhooks.on("issues", async ({ payload, octokit }) => {
  const { data: comment } = await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: "Hello, world!",
    },
  );

  app.log.info("[app] Comment created: %s", comment.html_url);
});

const relay = new AppWebhookRelay({
  owner: "gr2m",
  repo: "github-webhooks-relay",
  app,
});

relay.on("error", (error) => {
  console.log("error: %s", error);
});

relay.start();
```

## API

### Constructor

```js
const relay = new WebhookRelay(options);
```

<table>
  <thead align=left>
    <tr>
      <th>
        name
      </th>
      <th>
        type
      </th>
      <th width=100%>
        description
      </th>
    </tr>
  </thead>
  <tbody align=left valign=top>
    <tr>
      <th>
        <code>options.owner</code>
      </th>
      <td>
        <code>string</code>
      </td>
      <td>

The account login of the GitHub user or organization. When set, webhooks will be filtered for the given account only.

</td>
    </tr>
    <tr>
      <th>
        <code>options.repo</code>
      </th>
      <td>
        <code>string</code>
      </td>
      <td>

The name of a test repository. When set, webhooks will be filtered for the given repository only.

</td>
    </tr>
    <tr>
      <th>
        <code>options.app</code>
      </th>
      <td>
        <code>app</code>
      </td>
      <td>

**Required**. `app` is an instance of [`@octokit/app`](https://github.com/octokit/app.js/#readme) or [`octokit`'s `App` constructor](https://github.com/octokit/octokit.js/#octokit-api-client)

</td>
    </tr>
    <tr>
      <th>
        <code>options.events</code>
      </th>
      <td>
        <code>string[]</code>
      </td>
      <td>

The list of events that the webhook should subscribe to. For a list of supported event names, see [the GitHub docs](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads).

Defaults to the app's subscribed events.

</td>
    </tr>
  </tbody>
</table>

### `relay.on()`

```js
relay.on(eventName, callback);
```

<table>
  <thead align=left>
    <tr>
      <th>
        name
      </th>
      <th>
        type
      </th>
      <th width=100%>
        description
      </th>
    </tr>
  </thead>
  <tbody align=left valign=top>
    <tr>
      <th>
        <code>eventName</code>
      </th>
      <td>
        <code>string</code>
      </td>
      <td>

**Required**. Supported events are

1. `webhook` - emitted when a webhook is received
1. `start` - emitted when the relay is started
1. `stop` - emitted when the relay is stopped
1. `error` - emitted when an error occurs

</td>
    </tr>
    <tr>
      <th>
        <code>callback</code>
      </th>
      <td>
        <code>function</code>
      </td>
      <td>

**Required**. The event handler.

When `eventName` is `webhook`, the callback is called with an object with the following properties:

- `id` - the webhook delivery GUID
- `name` - the name of the event
- `body` - the webhook payload as string<sup>†</sup>
- `signature` - the signature of the webhook payload<sup>††</sup>
- `headers` - the headers of the webhook request

No arguments are passed when `eventName` is set to `start` or `stop`.

When `eventName` is `error`, the callback is called with an error object.

<sub>†The webhook payload is passed as string in case the signature needs to be verified. Parsing the JSON and later stringifying it again bight result in a signature mismatch.</sub>

<sub>††The signature is calculated based on the amended payload with the additional `installation` key</sub>

</td>
    </tr>
  </tbody>
</table>

### `relay.start()`

```js
relay.start();
```

Starts polling webhook events delivered by the app.

### `relay.stop()`

```js
relay.stop();
```

Starts polling webhook events delivered by the app.

## How it works

Webhooks that were delivered by the app are retrieved using the [`GET /app/hook/deliveries`](https://docs.github.com/en/rest/apps/webhooks?apiVersion=2022-11-28#list-deliveries-for-an-app-webhook) REST API endpoint. Each webhook payload is then retrieved using the [`GET /app/hook/deliveries/{delivery_id}`](https://docs.github.com/en/rest/apps/webhooks?apiVersion=2022-11-28#get-a-delivery-for-an-app-webhook) REST API endpoint.

The event is then injected into the Octokit app instance using [`app.webhooks.receive()`](https://github.com/octokit/webhooks.js/tree/b77c5a55c23899b51787ed6eb5e47fc7d6540ec4#webhooksreceive).

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## See also

- [`github-webhook-relay`](https://github.com/gr2m/github-webhook-relay/#readme) - The webhook relay this libary is built upon
- [`github-app-webhook-relay`](https://github.com/gr2m/github-app-webhook-relay/#readme) - The webhook relay this libary is built upon

## License

[ISC](LICENSE)
