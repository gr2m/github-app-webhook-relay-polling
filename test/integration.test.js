import test from "ava";
import { App } from "@octokit/app";
import { Octokit } from "@octokit/core";

import Relay from "../index.js";

import { delivery, event } from "./fixtures/issues.edited.js";

test("README example", async (t) => {
  return new Promise(async (resolve, reject) => {
    const TestOctokit = Octokit.plugin((octokit) => {
      octokit.hook.wrap("request", (request, options) => {
        const route = `${options.method} ${options.url}`;

        options.headers["user-agent"] = "test";
        t.snapshot(options, route);

        if (route === "GET /app") {
          return {
            data: {
              slug: "test-app",
              events: ["issues"],
            },
            headers: {
              date: "2024-01-29T00:00:00Z",
            },
          };
        }

        if (route === "GET /repos/{owner}/{repo}") {
          return {
            data: {
              id: 1,
            },
          };
        }

        if (
          [
            "GET /repos/{owner}/{repo}/installation",
            "GET /orgs/{org}/installation",
          ].includes(route)
        ) {
          return {
            data: {
              id: 1,
            },
          };
        }

        if (route === "GET /app/hook/deliveries") {
          return {
            data: [delivery],
            headers: {
              etag: "etag",
            },
          };
        }

        if (route === "GET /app/hook/deliveries/{delivery_id}") {
          return {
            data: {
              guid: "1",
              event: "issues",
              request: {
                payload: event.payload,
              },
            },
          };
        }

        throw new Error(`unexpected request: ${route}`);
      });
    });

    const TestApp = App.defaults({
      appId: 1,
      privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu
KUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEm
o3qGy0t6z09AIJtH+5OeRV1be+N4cDYJKffGzDa88vQENZiRm0GRq6a+HPGQMd2k
TQIhAKMSvzIBnni7ot/OSie2TmJLY4SwTQAevXysE2RbFDYdAiEBCUEaRQnMnbp7
9mxDXDf6AU0cN/RPBjb9qSHDcWZHGzUCIG2Es59z8ugGrDY+pxLQnwfotadxd+Uy
v/Ow5T0q5gIJAiEAyS4RaI9YG8EWx/2w0T67ZUVAw8eOMB6BIUg0Xcu+3okCIBOs
/5OiPgoTdSy7bcF9IGpSE8ZgGKzgYQVZeN97YE00
-----END RSA PRIVATE KEY-----
    `,
      webhooks: {
        secret: "secret",
      },
      Octokit: TestOctokit,
    });

    const app = new TestApp();

    const relay = new Relay({
      owner: "gr2m",
      repo: "github-app-webhook-relay-polling",
      app,
    });

    relay.on("error", reject);

    let startReceived;
    let appWebhookReceived;
    let relayWebhookReceived;
    app.webhooks.on("issues.edited", (event) => {
      appWebhookReceived = true;
      t.snapshot(event.payload, "app webhook payload for issues.edited");
      relay.stop();
    });

    relay.on("start", () => (startReceived = true));
    relay.on("webhook", (event) => {
      relayWebhookReceived = true;
      t.snapshot(event, "relay webhook");
    });
    relay.on("stop", () => {
      t.true(startReceived, "start event received");
      t.true(appWebhookReceived, "app webhook received");
      t.true(relayWebhookReceived, "relay webhook received");

      resolve();
    });

    relay.start();
  });
});
