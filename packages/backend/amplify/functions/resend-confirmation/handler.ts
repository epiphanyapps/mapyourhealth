import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - subpath export not visible to some TS module resolutions
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { randomBytes } from "crypto";

import type { Schema } from "../../data/resource";

const emailFrom = process.env.EMAIL_FROM || "noreply@mapyourhealth.info";
const confirmBaseUrl =
  process.env.CONFIRM_BASE_URL || "https://www.mapyourhealth.info";

let configured = false;
async function ensureConfigured() {
  if (configured) return;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
    process.env as Parameters<typeof getAmplifyDataClientConfig>[0],
  );
  Amplify.configure(resourceConfig, libraryOptions);
  configured = true;
}

const dataClient = generateClient<Schema>();
const ses = new SESClient({ region: "us-east-1" });

function generateConfirmationCode(): string {
  return randomBytes(32).toString("hex");
}

export const handler: Schema["resendConfirmation"]["functionHandler"] = async (
  event,
) => {
  await ensureConfigured();
  const { email, lang } = event.arguments;

  if (!email) {
    return { success: false, message: "Email is required" };
  }

  try {
    const { data: subscriber } =
      await dataClient.models.NewsletterSubscriber.get({ email });

    if (!subscriber) {
      return { success: false, message: "Subscriber not found" };
    }
    if (subscriber.confirmed) {
      return { success: false, message: "Subscriber already confirmed" };
    }

    const confirmationCode = generateConfirmationCode();
    await dataClient.models.NewsletterSubscriber.update({
      email,
      confirmationCode,
    });

    const confirmationUrl = `${confirmBaseUrl.replace(/\/$/, "")}/confirm/${confirmationCode}`;

    const content =
      lang === "fr"
        ? {
            subject: "Confirmez votre inscription à MapYourHealth",
            greeting: "Bonjour,",
            body: "Veuillez confirmer votre inscription en cliquant sur le bouton ci-dessous :",
            button: "Confirmer",
            signature: "L'équipe MapYourHealth",
          }
        : {
            subject: "Confirm your MapYourHealth subscription",
            greeting: "Dear friend,",
            body: "Please confirm your subscription by clicking the button below:",
            button: "Confirm Subscription",
            signature: "The MapYourHealth Team",
          };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.7; color: #000000; margin: 0; padding: 0; background-color: #9db835; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: #ffffff; padding: 20px; text-align: center; }
          .header h1 { color: #000000; font-size: 24px; font-weight: bold; }
          .content { background-color: #ffffff; padding: 20px; }
          .action-button { display: inline-block; padding: 10px 20px; background-color: #9db835; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #9db835; color: #ffffff; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>MapYourHealth</h1></div>
          <div class="content">
            <p>${content.greeting}</p>
            <p>${content.body}</p>
            <a href="${confirmationUrl}" class="action-button">${content.button}</a>
          </div>
          <div class="footer"><p>${content.signature}</p></div>
        </div>
      </body>
      </html>
    `;

    await ses.send(
      new SendEmailCommand({
        Destination: { ToAddresses: [email] },
        Message: {
          Body: { Html: { Data: html } },
          Subject: { Data: content.subject },
        },
        Source: emailFrom,
      }),
    );

    return { success: true, message: "Confirmation email resent" };
  } catch (error) {
    console.error("Resend confirmation error:", error);
    return { success: false, message: "Failed to resend confirmation" };
  }
};
