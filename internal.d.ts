import { EventEmitter } from "node:events";

import { EventPayloadMap } from "@octokit/webhooks-types";
import { App } from "@octokit/app";

import { GitHubAppWebHookRelay } from "./index";

export type Options = GitHubAppWebHookRelay.Options;

export type State = {
  owner: string;
  repo?: string;
  repoId?: number;
  eventEmitter: EventEmitter;
  app: App;
  events?: (keyof EventPayloadMap)[];
  installationId?: number;
  isPolling: boolean;
  /** ISO timestamp */
  startTimeOnServer?: string;
  lastPollEtag?: string;
  timeout?: NodeJS.Timeout;
  sinceId?: number;
};
