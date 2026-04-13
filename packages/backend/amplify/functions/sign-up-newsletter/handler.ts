import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { randomBytes } from "crypto";

import { env } from "$amplify/env/sign-up-newsletter";
import type { Schema } from "../../data/resource";

const emailFrom = env.EMAIL_FROM;

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: "identityPool",
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
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
const ses = new SESClient({ region: "us-east-1" });

function generateConfirmationCode(): string {
  return randomBytes(32).toString("hex");
}

export const handler: Schema["signUpNewsletter"]["functionHandler"] = async (
  event,
) => {
  const { email, lang, callbackURL, country, zip } = event.arguments;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Invalid email format" };
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

    let baseUrl: string;
    if (
      callbackURL?.includes("localhost") ||
      callbackURL?.includes("127.0.0.1")
    ) {
      baseUrl = `http://${callbackURL}`;
    } else {
      baseUrl = `https://${callbackURL}`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");

    const confirmationUrl = `${baseUrl}/confirm/${confirmationCode}`;

    const emailContent = {
      en: {
        subject: "Welcome to MapYourHealth",
        greeting: "Dear friend,",
        thankYouMessage: "Thank you for taking care of your health.",
        cityMessage:
          "Currently, your city is not in our database. But rest assured that we will notify you via email as soon as we have mapped your neighborhood.",
        mainMessage:
          "Monitoring environmental health is essential for a safer and healthier world. By identifying and addressing local health hazards, you can prevent chronic illnesses, reduce exposure to harmful pollutants, and ensure access to clean air, water, and safe living conditions.",
        followUpMessage:
          "In doing so, you can protect the well-being of current and future generations.",
        inviteMessage:
          "Help us save more lives by inviting family and friends to Sign Up at",
        closingMessage: "Wishing you a long and fulfilling life.",
        footerSignature: "The MapYourHealth team",
        confirmButton: "Confirm Subscription",
        confirmMessage:
          "Please confirm your subscription by clicking the button below:",
      },
      fr: {
        subject: "Bienvenue à MapYourHealth",
        greeting: "Bonjour,",
        thankYouMessage: "Merci de prendre soin de votre santé.",
        cityMessage:
          "Présentement, votre ville n'est pas dans notre base de données. Mais rassurez-vous, nous vous enverrons un courriel dès que nous aurons cartographié votre quartier.",
        mainMessage:
          "Veiller à la santé environnementale est essentiel pour un monde plus sûr et plus sain. En identifiant les menaces environnementales dans votre localité, vous pouvez prévenir des maladies chroniques, réduire l'exposition aux polluants nocifs et garantir l'accès à de l'air pur, de l'eau propre et des conditions de vie sûres.",
        followUpMessage:
          "Ce faisant, vous protégez le bien-être des générations présentes et futures.",
        inviteMessage:
          "Aidez-nous à sauver plus de vies en invitant vos amis et votre famille à s'inscrire sur",
        closingMessage: "Amicalement,",
        footerSignature: "L'équipe de MapYourHealth",
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
            <p>${content.cityMessage}</p>
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
