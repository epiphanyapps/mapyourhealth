import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - subpath export not visible to some TS module resolutions
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { randomBytes } from "crypto";

import type { Schema } from "../../data/resource";

const emailFrom =
  process.env.EMAIL_FROM || "noreply@mapyourhealth.info";

let configured = false;
async function ensureConfigured() {
  if (configured) return;
  const { resourceConfig, libraryOptions } =
    await getAmplifyDataClientConfig(
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

export const handler: Schema["subscribeToNewsletter"]["functionHandler"] = async (
  event,
) => {
  await ensureConfigured();
  const { email, lang, callbackURL, country, zip } = event.arguments;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Invalid email format" };
  }

  const ALLOWED_HOSTS = [
    "mapyourhealth.info",
    "www.mapyourhealth.info",
    "main.dv0j563gt073v.amplifyapp.com",
    "localhost",
    "localhost:3000",
    "localhost:3001",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
  ];

  const host = callbackURL?.replace(/\/$/, "") || "mapyourhealth.info";
  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { success: false, message: "Invalid callback URL" };
  }

  try {
    const confirmationCode = generateConfirmationCode();
    await dataClient.models.NewsletterSubscriber.create({
      email,
      country: country || undefined,
      zip: zip || undefined,
      confirmed: false,
      confirmationCode,
    });

    const isLocal = host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
    const baseUrl = `${isLocal ? "http" : "https"}://${host}`;

    const confirmationUrl = `${baseUrl}/confirm/${confirmationCode}`;

    const webBetaUrl = "https://app.mapyourhealth.info";

    const emailContent = {
      en: {
        subject: "Welcome to MapYourHealth",
        greeting: "Dear friend,",
        thankYouMessage: "Thank you for taking care of your health.",
        tryWebBefore: "While waiting for our mobile app, try our Beta Web Version Now by clicking on the following link:",
        tryWebCta: "TRY IT!",
        mainMessage:
          "Monitoring environmental health is essential for a safer and healthier world. By identifying and addressing local health hazards, you can prevent chronic illnesses, reduce exposure to harmful pollutants, and ensure access to clean air, water, and safe living conditions.",
        followUpMessage:
          "In doing so, you can protect the well-being of current and future generations.",
        inviteMessage:
          "Help us save more lives by inviting family and friends to Sign Up at",
        closingMessage: "Wishing you a long and fulfilling life.",
        footerSignature: "The MapYourHealth Team",
        confirmButton: "Confirm Subscription",
        confirmMessage:
          "Please confirm your subscription by clicking the button below:",
      },
      fr: {
        subject: "Bienvenue à MapYourHealth",
        greeting: "Bonjour,",
        thankYouMessage: "Merci de prendre soin de votre santé.",
        tryWebBefore: "En attendant notre application mobile, essayez dès maintenant notre version Web Bêta en cliquant sur le lien suivant :",
        tryWebCta: "ESSAYEZ-LA !",
        mainMessage:
          "Veiller à la santé environnementale est essentiel pour un monde plus sûr et plus sain. En identifiant les menaces environnementales dans votre localité, vous pouvez prévenir des maladies chroniques, réduire l'exposition aux polluants nocifs et garantir l'accès à de l'air pur, de l'eau propre et des conditions de vie sûres.",
        followUpMessage:
          "Ce faisant, vous protégez le bien-être des générations présentes et futures.",
        inviteMessage:
          "Aidez-nous à sauver plus de vies en invitant vos amis et votre famille à s'inscrire sur",
        closingMessage: "Amicalement,",
        footerSignature: "L'équipe MapYourHealth",
        confirmButton: "Confirmer",
        confirmMessage:
          "Veuillez confirmer votre inscription en cliquant sur le bouton ci-dessous :",
      },
    };

    const content = emailContent[lang === "fr" ? "fr" : "en"];

    const finalHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.7; color: #000000; margin: 0; padding: 0; background-color: #9db835; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: #ffffff; padding: 20px; text-align: center; }
          .header h1 { color: #000000; font-size: 24px; font-weight: bold; }
          .content { background-color: #ffffff; padding: 20px; }
          .content p { margin-bottom: 16px; }
          .action-button { display: inline-block; padding: 10px 20px; background-color: #9db835; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #9db835; color: #ffffff; padding: 20px; text-align: center; }
          a { color: #9db835; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to MapYourHealth</h1>
          </div>
          <div class="content">
            <p>${content.greeting}</p>
            <p>${content.thankYouMessage}</p>
            <p>${content.tryWebBefore} <a href="${webBetaUrl}"><strong>${content.tryWebCta}</strong></a></p>
            <p>${content.mainMessage}</p>
            <p>${content.followUpMessage}</p>
            <p>${content.inviteMessage} <a href="https://mapyourhealth.info">MapYourHealth.info</a></p>
            <p>${content.closingMessage}</p>
            <p>${content.confirmMessage}</p>
            <a href="${confirmationUrl}" class="action-button">${content.confirmButton}</a>
          </div>
          <div class="footer">
            <p>${content.footerSignature}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await ses.send(
      new SendEmailCommand({
        Destination: { ToAddresses: [email] },
        Message: {
          Body: { Html: { Data: finalHtml } },
          Subject: { Data: content.subject },
        },
        Source: emailFrom,
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Newsletter signup error:", error);
    if (error && typeof error === "object" && "errors" in error) {
      const errorArray = (error as { errors: { errorType: string }[] }).errors;
      if (
        errorArray?.[0]?.errorType?.includes(
          "DynamoDB:ConditionalCheckFailedException",
        )
      ) {
        return {
          success: false,
          message:
            "A user with your email address has already been subscribed for updates.",
        };
      }
    }
    return { success: false, message: "Failed to process subscription" };
  }
};
