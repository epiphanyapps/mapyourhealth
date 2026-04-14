import { defineBackend } from '@aws-amplify/backend';
import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import {
  StartingPosition,
  EventSourceMapping,
  Function as LambdaFunction,
  FunctionUrlAuthType,
  HttpMethod,
} from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { CfnApp } from 'aws-cdk-lib/aws-pinpoint';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendNotifications } from './functions/send-notifications/resource';
import { sendEmailAlert } from './functions/send-email-alert/resource';
import { processNotifications } from './functions/process-notifications/resource';
import { onLocationMeasurementUpdate } from './functions/on-location-measurement-update/resource';
import { requestMagicLink } from './functions/request-magic-link/resource';
import { placesAutocomplete } from './functions/places-autocomplete/resource';
import { resolveLocation } from './functions/resolve-location/resource';
import { deleteAccount } from './functions/delete-account/resource';
import { manageData } from './functions/manage-data/resource';
import { subscribeToNewsletter } from './functions/subscribe-to-newsletter/resource';
import { confirmNewsletter } from './functions/confirm-newsletter/resource';
import { resendConfirmation } from './functions/resend-confirmation/resource';
// import { storage } from './storage/resource';

/**
 * MapYourHealth Backend
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/
 */
const backend = defineBackend({
  auth,
  data,
  sendNotifications,
  sendEmailAlert,
  processNotifications,
  onLocationMeasurementUpdate,
  requestMagicLink,
  placesAutocomplete,
  resolveLocation,
  deleteAccount,
  manageData,
  subscribeToNewsletter,
  confirmNewsletter,
  resendConfirmation,
  // storage,
});

// ============================================
// LocationMeasurement Stream -> Automatic Notifications
// ============================================

// Get LocationMeasurement table for stream trigger
const locationMeasurementTable = backend.data.resources.tables['LocationMeasurement'];

// Get the onLocationMeasurementUpdate Lambda function and its stack
const onLocationMeasurementLambda = backend.onLocationMeasurementUpdate.resources.lambda as LambdaFunction;
const onLocationMeasurementStack = Stack.of(onLocationMeasurementLambda);

// Set environment variable for process-notifications function name
onLocationMeasurementLambda.addEnvironment(
  'PROCESS_NOTIFICATIONS_FUNCTION_NAME',
  backend.processNotifications.resources.lambda.functionName
);

// Grant the onLocationMeasurementUpdate function permissions to read from DynamoDB streams
const onLocationMeasurementStreamPolicy = new Policy(
  onLocationMeasurementStack,
  'OnLocationMeasurementStreamPolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:DescribeStream',
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:ListStreams',
        ],
        resources: [locationMeasurementTable.tableStreamArn!],
      }),
    ],
  }
);
backend.onLocationMeasurementUpdate.resources.lambda.role?.attachInlinePolicy(onLocationMeasurementStreamPolicy);

// Grant the onLocationMeasurementUpdate function permissions to invoke processNotifications
const onLocationMeasurementInvokePolicy = new Policy(
  onLocationMeasurementStack,
  'OnLocationMeasurementInvokePolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [backend.processNotifications.resources.lambda.functionArn],
      }),
    ],
  }
);
backend.onLocationMeasurementUpdate.resources.lambda.role?.attachInlinePolicy(onLocationMeasurementInvokePolicy);

// Create DynamoDB Stream event source mapping for LocationMeasurement table
const locationMeasurementStreamMapping = new EventSourceMapping(
  onLocationMeasurementStack,
  'LocationMeasurementStreamMapping',
  {
    target: backend.onLocationMeasurementUpdate.resources.lambda,
    eventSourceArn: locationMeasurementTable.tableStreamArn!,
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    bisectBatchOnError: true,
    retryAttempts: 3,
  }
);

// Ensure the mapping depends on the stream policy
locationMeasurementStreamMapping.node.addDependency(onLocationMeasurementStreamPolicy);

// ============================================
// Magic Link Authentication Setup
// ============================================

// Get User Pool ID for environment variables
const userPoolId = backend.auth.resources.userPool.userPoolId;
const authStack = Stack.of(backend.auth.resources.userPool);

// Create DynamoDB table for rate limiting magic link requests
const rateLimitTable = new Table(authStack, 'MagicLinkRateLimitTable', {
  tableName: `MagicLinkRateLimit-${authStack.stackName}`,
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.DESTROY, // For development - change to RETAIN for production
});

// Get the requestMagicLink Lambda function
const requestMagicLinkLambda = backend.requestMagicLink.resources.lambda as LambdaFunction;

// Set environment variables for requestMagicLink function
requestMagicLinkLambda.addEnvironment('USER_POOL_ID', userPoolId);
requestMagicLinkLambda.addEnvironment('RATE_LIMIT_TABLE_NAME', rateLimitTable.tableName);

// Grant requestMagicLink function permissions for Cognito
const cognitoPolicy = new Policy(authStack, 'RequestMagicLinkCognitoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [backend.auth.resources.userPool.userPoolArn],
    }),
  ],
});
backend.requestMagicLink.resources.lambda.role?.attachInlinePolicy(cognitoPolicy);

// Grant requestMagicLink function permissions for SES
const requestMagicLinkSesPolicy = new Policy(authStack, 'RequestMagicLinkSESPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }),
  ],
});
backend.requestMagicLink.resources.lambda.role?.attachInlinePolicy(requestMagicLinkSesPolicy);

// Grant requestMagicLink function permissions for DynamoDB rate limit table
const rateLimitPolicy = new Policy(authStack, 'RequestMagicLinkRateLimitPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
      ],
      resources: [rateLimitTable.tableArn],
    }),
  ],
});
backend.requestMagicLink.resources.lambda.role?.attachInlinePolicy(rateLimitPolicy);

// Create a function URL for the requestMagicLink function (public access)
const functionUrl = requestMagicLinkLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['Content-Type'],
  },
});

// Export the function URL for frontend use
new CfnOutput(authStack, 'RequestMagicLinkFunctionUrl', {
  value: functionUrl.url,
  description: 'URL for the Request Magic Link function',
  exportName: `${authStack.stackName}-RequestMagicLinkUrl`,
});

// ============================================
// Process Notifications Lambda Setup
// ============================================

// Get DynamoDB tables from the data resources
const subscriptionsTable = backend.data.resources.tables['UserSubscription'];
const notificationLogTable = backend.data.resources.tables['NotificationLog'];

// Get the processNotifications Lambda function and its stack
const processNotificationsLambda = backend.processNotifications.resources.lambda as LambdaFunction;
const processNotificationsStack = Stack.of(processNotificationsLambda);

// Set environment variables for processNotifications function
processNotificationsLambda.addEnvironment('SUBSCRIPTIONS_TABLE_NAME', subscriptionsTable.tableName);
processNotificationsLambda.addEnvironment('NOTIFICATION_LOG_TABLE_NAME', notificationLogTable.tableName);
processNotificationsLambda.addEnvironment('SEND_EMAIL_FUNCTION_NAME', backend.sendEmailAlert.resources.lambda.functionName);
processNotificationsLambda.addEnvironment('SEND_PUSH_FUNCTION_NAME', backend.sendNotifications.resources.lambda.functionName);
processNotificationsLambda.addEnvironment('USER_POOL_ID', userPoolId);

// Grant processNotifications function permissions to query subscriptions and write logs
const processNotificationsDynamoPolicy = new Policy(processNotificationsStack, 'ProcessNotificationsDynamoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:GetItem',
      ],
      resources: [
        subscriptionsTable.tableArn,
        `${subscriptionsTable.tableArn}/index/*`,
      ],
    }),
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
      ],
      resources: [
        notificationLogTable.tableArn,
      ],
    }),
  ],
});
backend.processNotifications.resources.lambda.role?.attachInlinePolicy(processNotificationsDynamoPolicy);

// Grant processNotifications function permissions to invoke email and push Lambdas
const processNotificationsInvokePolicy = new Policy(processNotificationsStack, 'ProcessNotificationsInvokePolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        backend.sendEmailAlert.resources.lambda.functionArn,
        backend.sendNotifications.resources.lambda.functionArn,
      ],
    }),
  ],
});
backend.processNotifications.resources.lambda.role?.attachInlinePolicy(processNotificationsInvokePolicy);

// Grant processNotifications function permissions to look up user emails from Cognito
// Use wildcard resource to avoid circular dependency between data and auth stacks
const processNotificationsCognitoPolicy = new Policy(processNotificationsStack, 'ProcessNotificationsCognitoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser'],
      resources: ['*'], // Use wildcard to avoid cross-stack resource reference
    }),
  ],
});
backend.processNotifications.resources.lambda.role?.attachInlinePolicy(processNotificationsCognitoPolicy);

// Get sendEmailAlert Lambda and its stack for SES permissions
const sendEmailAlertLambda = backend.sendEmailAlert.resources.lambda as LambdaFunction;
const sendEmailAlertStack = Stack.of(sendEmailAlertLambda);

// Grant sendEmailAlert function permissions to use SES
const sendEmailAlertSesPolicy = new Policy(sendEmailAlertStack, 'SendEmailAlertSESPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }),
  ],
});
backend.sendEmailAlert.resources.lambda.role?.attachInlinePolicy(sendEmailAlertSesPolicy);

// Export the processNotifications function name for admin app
new CfnOutput(processNotificationsStack, 'ProcessNotificationsFunctionName', {
  value: backend.processNotifications.resources.lambda.functionName,
  description: 'Lambda function name for processing notifications',
  exportName: `${processNotificationsStack.stackName}-ProcessNotificationsFunctionName`,
});

// ============================================
// Places Autocomplete Lambda Setup
// ============================================

// Get the placesAutocomplete Lambda function and its stack
const placesAutocompleteLambda = backend.placesAutocomplete.resources.lambda as LambdaFunction;
const placesAutocompleteStack = Stack.of(placesAutocompleteLambda);

// Create DynamoDB table for caching Places API results
const placesCacheTable = new Table(placesAutocompleteStack, 'PlacesCacheTable', {
  tableName: `PlacesCache-${placesAutocompleteStack.stackName}`,
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.DESTROY, // For development - change to RETAIN for production
});

// Set environment variable for cache table name
placesAutocompleteLambda.addEnvironment('CACHE_TABLE_NAME', placesCacheTable.tableName);

// Grant placesAutocomplete function permissions for DynamoDB cache table
const placesCachePolicy = new Policy(placesAutocompleteStack, 'PlacesCacheDynamoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
      ],
      resources: [placesCacheTable.tableArn],
    }),
  ],
});
backend.placesAutocomplete.resources.lambda.role?.attachInlinePolicy(placesCachePolicy);

// ============================================
// Resolve Location Lambda Setup
// ============================================

// Get DynamoDB tables for location resolution
const locationTable = backend.data.resources.tables['Location'];
const jurisdictionTable = backend.data.resources.tables['Jurisdiction'];

// Get the resolveLocation Lambda function and its stack
const resolveLocationLambda = backend.resolveLocation.resources.lambda as LambdaFunction;
const resolveLocationStack = Stack.of(resolveLocationLambda);

// Set environment variables for table names
resolveLocationLambda.addEnvironment('CACHE_TABLE_NAME', placesCacheTable.tableName);
resolveLocationLambda.addEnvironment('LOCATION_TABLE_NAME', locationTable.tableName);
resolveLocationLambda.addEnvironment('JURISDICTION_TABLE_NAME', jurisdictionTable.tableName);
resolveLocationLambda.addEnvironment('LOCATION_MEASUREMENT_TABLE_NAME', locationMeasurementTable.tableName);

// Grant resolveLocation function permissions for DynamoDB tables
const resolveLocationDynamoPolicy = new Policy(resolveLocationStack, 'ResolveLocationDynamoPolicy', {
  statements: [
    // PlacesCache: read/write for caching place details
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
      resources: [placesCacheTable.tableArn],
    }),
    // Location: read (query by city index) + write (create new locations)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:Query', 'dynamodb:PutItem'],
      resources: [
        locationTable.tableArn,
        `${locationTable.tableArn}/index/*`,
      ],
    }),
    // Jurisdiction: read (query by code index)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [
        jurisdictionTable.tableArn,
        `${jurisdictionTable.tableArn}/index/*`,
      ],
    }),
    // LocationMeasurement: read (query by city index for data availability check)
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [
        locationMeasurementTable.tableArn,
        `${locationMeasurementTable.tableArn}/index/*`,
      ],
    }),
  ],
});
backend.resolveLocation.resources.lambda.role?.attachInlinePolicy(resolveLocationDynamoPolicy);

// ============================================
// Delete Account Lambda Setup
// ============================================

// Get DynamoDB tables for user data cleanup
const healthRecordTable = backend.data.resources.tables['HealthRecord'];
const hazardReportTable = backend.data.resources.tables['HazardReport'];

// Get the deleteAccount Lambda function and its stack
const deleteAccountLambda = backend.deleteAccount.resources.lambda as LambdaFunction;
const deleteAccountStack = Stack.of(deleteAccountLambda);

// Set environment variables for table names using string values to avoid circular dependency
deleteAccountLambda.addEnvironment('USER_POOL_ID', userPoolId);
// Table names will be passed at runtime or retrieved dynamically to avoid cross-stack references

// Grant deleteAccount function permissions to delete Cognito user
const deleteAccountCognitoPolicy = new Policy(deleteAccountStack, 'DeleteAccountCognitoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:AdminDeleteUser'],
      resources: [backend.auth.resources.userPool.userPoolArn],
    }),
  ],
});
backend.deleteAccount.resources.lambda.role?.attachInlinePolicy(deleteAccountCognitoPolicy);

// Grant deleteAccount function permissions to query and delete from all user-data tables
// Use wildcard to avoid circular dependency with data stack
const deleteAccountDynamoPolicy = new Policy(deleteAccountStack, 'DeleteAccountDynamoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:BatchWriteItem', 
        'dynamodb:DeleteItem',
        'dynamodb:DescribeTable', // Add describe to get table info dynamically
      ],
      resources: [
        `arn:aws:dynamodb:*:*:table/*`, // Use wildcard pattern to avoid cross-stack dependency
      ],
    }),
  ],
});
backend.deleteAccount.resources.lambda.role?.attachInlinePolicy(deleteAccountDynamoPolicy);

// ============================================
// Manage Data Lambda Setup
// ============================================

const manageDataLambda = backend.manageData.resources.lambda as LambdaFunction;
const manageDataStack = Stack.of(manageDataLambda);

// Reference data tables that the manage-data Lambda can operate on
const referenceTableNames = [
  'Jurisdiction', 'Contaminant', 'ContaminantThreshold',
  'Location', 'LocationMeasurement', 'LocationObservation',
  'Category', 'SubCategory', 'ObservedProperty', 'PropertyThreshold',
] as const;

// Set environment variables for all reference table names
for (const name of referenceTableNames) {
  const table = backend.data.resources.tables[name];
  manageDataLambda.addEnvironment(`${name.toUpperCase()}_TABLE_NAME`, table.tableName);
}

// Grant DynamoDB permissions on reference tables only — never user data tables
const manageDataDynamoPolicy = new Policy(manageDataStack, 'ManageDataDynamoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:Scan',
        'dynamodb:BatchWriteItem',
        'dynamodb:DeleteItem',
        'dynamodb:PutItem',
        'dynamodb:DescribeTable',
      ],
      resources: referenceTableNames.map((name) => {
        const table = backend.data.resources.tables[name];
        return table.tableArn;
      }),
    }),
  ],
});
backend.manageData.resources.lambda.role?.attachInlinePolicy(manageDataDynamoPolicy);

// ============================================
// Analytics (Pinpoint) Setup
// ============================================

const analyticsStack = backend.createStack('analytics-stack');

// Create a Pinpoint app for analytics
const pinpoint = new CfnApp(analyticsStack, 'Pinpoint', {
  name: 'MapYourHealth',
});

// IAM policy for authenticated and unauthenticated users to send analytics events
const pinpointPolicy = new Policy(analyticsStack, 'PinpointPolicy', {
  policyName: 'PinpointPolicy',
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['mobiletargeting:UpdateEndpoint', 'mobiletargeting:PutEvents'],
      resources: [pinpoint.attrArn + '/*'],
    }),
  ],
});

backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(pinpointPolicy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(pinpointPolicy);

// ============================================
// Newsletter Subscribe Lambda Setup
// ============================================

const subscribeToNewsletterLambda = backend.subscribeToNewsletter.resources.lambda as LambdaFunction;
const subscribeToNewsletterStack = Stack.of(subscribeToNewsletterLambda);

const subscribeToNewsletterSesPolicy = new Policy(subscribeToNewsletterStack, 'SubscribeToNewsletterSESPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }),
  ],
});
backend.subscribeToNewsletter.resources.lambda.role?.attachInlinePolicy(subscribeToNewsletterSesPolicy);

// ============================================
// Resend Confirmation Lambda Setup
// ============================================

const resendConfirmationLambda = backend.resendConfirmation.resources.lambda as LambdaFunction;
const resendConfirmationStack = Stack.of(resendConfirmationLambda);

resendConfirmationLambda.addEnvironment(
  'CONFIRM_BASE_URL',
  process.env.CONFIRM_BASE_URL || 'https://www.mapyourhealth.info',
);

const resendConfirmationSesPolicy = new Policy(resendConfirmationStack, 'ResendConfirmationSESPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }),
  ],
});
backend.resendConfirmation.resources.lambda.role?.attachInlinePolicy(resendConfirmationSesPolicy);

// Add Pinpoint config to amplify_outputs.json
backend.addOutput({
  analytics: {
    amazon_pinpoint: {
      app_id: pinpoint.ref,
      aws_region: Stack.of(pinpoint).region,
    },
  },
});
