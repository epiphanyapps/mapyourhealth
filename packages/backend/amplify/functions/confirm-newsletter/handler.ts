import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "../../data/resource";

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!,
        region: process.env.AWS_REGION!,
        defaultAuthMode: "identityPool",
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            sessionToken: process.env.AWS_SESSION_TOKEN!,
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  },
);

const dataClient = generateClient<Schema>();

export const handler: Schema["confirmNewsletter"]["functionHandler"] = async (
  event,
) => {
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
