// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - subpath export not visible to some TS module resolutions
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated at build
import { env } from "$amplify/env/confirm-newsletter";

import type { Schema } from "../../data/resource";

let configured = false;
async function ensureConfigured() {
  if (configured) return;
  const { resourceConfig, libraryOptions } =
    await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  configured = true;
}

const dataClient = generateClient<Schema>();

export const handler: Schema["confirmNewsletter"]["functionHandler"] = async (
  event,
) => {
  await ensureConfigured();
  const { confirmationCode } = event.arguments;

  if (!confirmationCode) {
    return { success: false, message: "Confirmation code is required" };
  }

  try {
    const result =
      await dataClient.models.NewsletterSubscriber.listNewsletterSubscriberByConfirmationCode(
        { confirmationCode },
      );

    const subscribers = result.data;

    if (!subscribers || subscribers.length === 0) {
      return { success: false, message: "Invalid confirmation code" };
    }

    const subscriber = subscribers[0];

    if (subscriber.confirmed) {
      return { success: false, message: "Email already confirmed" };
    }

    await dataClient.models.NewsletterSubscriber.update({
      email: subscriber.email,
      confirmed: true,
    });

    return { success: true, message: "Email confirmed successfully" };
  } catch (error) {
    console.error("Error confirming email:", error);
    return { success: false, message: "Failed to confirm email" };
  }
};
