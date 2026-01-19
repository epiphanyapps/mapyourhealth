/**
 * Send Email Alert Lambda Handler
 *
 * Sends email notifications to subscribers when safety stats change.
 * Uses Amazon SES to deliver emails.
 */

import type { Handler } from 'aws-lambda'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

// Initialize SES client
const sesClient = new SESClient({})

interface EmailAlertEvent {
  /** The stat that changed */
  statId: string
  /** Human-readable stat name */
  statName: string
  /** The zip code affected */
  zipCode: string
  /** City name for display */
  cityName?: string
  /** Previous status before change */
  oldStatus: 'danger' | 'warning' | 'safe'
  /** New status after change */
  newStatus: 'danger' | 'warning' | 'safe'
  /** Current measured value */
  currentValue: number
  /** Unit of measurement */
  unit: string
  /** List of subscriber emails to notify */
  subscriberEmails: string[]
}

interface EmailAlertResult {
  success: boolean
  sentCount: number
  failedCount: number
  errors: string[]
}

/**
 * Generate HTML email content for safety alert
 */
function generateEmailHtml(event: EmailAlertEvent): string {
  const { statName, zipCode, cityName, oldStatus, newStatus, currentValue, unit } = event

  const statusColors = {
    danger: '#DC2626',
    warning: '#F59E0B',
    safe: '#10B981',
  }

  const statusLabels = {
    danger: 'DANGER',
    warning: 'WARNING',
    safe: 'SAFE',
  }

  const locationDisplay = cityName ? `${cityName} (${zipCode})` : zipCode

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Safety Alert - MapYourHealth</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: ${statusColors[newStatus]}; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Safety Alert</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">MapYourHealth</p>
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px;">
        ${statName} Status Changed
      </h2>

      <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
        A safety condition in <strong>${locationDisplay}</strong> has changed:
      </p>

      <!-- Status Change Box -->
      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          <div style="text-align: center;">
            <span style="display: inline-block; padding: 6px 12px; border-radius: 4px; background-color: ${statusColors[oldStatus]}; color: #ffffff; font-weight: 600; font-size: 14px;">
              ${statusLabels[oldStatus]}
            </span>
            <p style="margin: 8px 0 0 0; color: #71717a; font-size: 12px;">Previous</p>
          </div>
          <div style="font-size: 24px; color: #a1a1aa;">→</div>
          <div style="text-align: center;">
            <span style="display: inline-block; padding: 6px 12px; border-radius: 4px; background-color: ${statusColors[newStatus]}; color: #ffffff; font-weight: 600; font-size: 14px;">
              ${statusLabels[newStatus]}
            </span>
            <p style="margin: 8px 0 0 0; color: #71717a; font-size: 12px;">Current</p>
          </div>
        </div>
      </div>

      <!-- Current Value -->
      <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #71717a; font-size: 14px;">Current Value</p>
        <p style="margin: 4px 0 0 0; color: #18181b; font-size: 24px; font-weight: 600;">
          ${currentValue} ${unit}
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <p style="color: #52525b; margin: 0 0 16px 0; font-size: 14px;">
          Open the MapYourHealth app for more details and recommendations.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 16px 24px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; color: #71717a; font-size: 12px;">
        You received this email because you have email notifications enabled for ${locationDisplay}.
      </p>
      <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 12px;">
        To unsubscribe, update your notification preferences in the MapYourHealth app.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text email content for safety alert
 */
function generateEmailText(event: EmailAlertEvent): string {
  const { statName, zipCode, cityName, oldStatus, newStatus, currentValue, unit } = event

  const statusLabels = {
    danger: 'DANGER',
    warning: 'WARNING',
    safe: 'SAFE',
  }

  const locationDisplay = cityName ? `${cityName} (${zipCode})` : zipCode

  return `
SAFETY ALERT - MapYourHealth

${statName} Status Changed

A safety condition in ${locationDisplay} has changed:

Previous Status: ${statusLabels[oldStatus]}
Current Status: ${statusLabels[newStatus]}
Current Value: ${currentValue} ${unit}

Open the MapYourHealth app for more details and recommendations.

---
You received this email because you have email notifications enabled for ${locationDisplay}.
To unsubscribe, update your notification preferences in the MapYourHealth app.
  `.trim()
}

/**
 * Lambda handler for sending email alerts
 *
 * @param event - Contains stat info, status change, and subscriber emails
 * @returns Result with count of sent emails and any errors
 */
export const handler: Handler<EmailAlertEvent, EmailAlertResult> = async (event) => {
  const { statId, statName, zipCode, newStatus, subscriberEmails } = event
  const errors: string[] = []
  let sentCount = 0
  let failedCount = 0

  const senderEmail = process.env.SES_SENDER_EMAIL || 'alerts@mapyourhealth.com'

  console.log(
    `Sending email alerts for stat ${statId} (${statName}) in zip ${zipCode} ` +
      `to ${subscriberEmails.length} subscribers`
  )

  // Only send alerts for danger or warning status changes
  if (newStatus === 'safe') {
    console.log('New status is safe, skipping email notification')
    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    }
  }

  const statusLabels = {
    danger: 'DANGER',
    warning: 'WARNING',
    safe: 'SAFE',
  }

  const subject = `[${statusLabels[newStatus]}] Safety Alert: ${statName} in ${
    event.cityName || zipCode
  }`
  const htmlBody = generateEmailHtml(event)
  const textBody = generateEmailText(event)

  // Send emails to each subscriber
  for (const email of subscriberEmails) {
    try {
      const command = new SendEmailCommand({
        Source: senderEmail,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      })

      await sesClient.send(command)
      sentCount++
      console.log(`Successfully sent email to ${email}`)
    } catch (error) {
      failedCount++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to send email to ${email}: ${errorMessage}`)
      errors.push(`${email}: ${errorMessage}`)
    }
  }

  console.log(`Email alert complete: ${sentCount} sent, ${failedCount} failed`)

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
    errors,
  }
}
