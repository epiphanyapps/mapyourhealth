import { defineBackend } from '@aws-amplify/backend';
import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import {
  // StartingPosition,
  // EventSourceMapping,
  Function as LambdaFunction,
  FunctionUrlAuthType,
  HttpMethod,
} from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendNotifications } from './functions/send-notifications/resource';
import { sendEmailAlert } from './functions/send-email-alert/resource';
import { processNotifications } from './functions/process-notifications/resource';
// import { onZipCodeStatUpdate } from './functions/on-zipcode-stat-update/resource';
import { requestMagicLink } from './functions/request-magic-link/resource';
import { placesAutocomplete } from './functions/places-autocomplete/resource';
import { deleteAccount } from './functions/delete-account/resource';
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
  // onZipCodeStatUpdate, // Disabled: tables removed in schema redesign
  requestMagicLink,
  placesAutocomplete,
  deleteAccount,
  // storage,
});

// ============================================
// OLD DATA MODEL - DISABLED PENDING REFACTOR
// ============================================
// The following code references old tables (ZipCodeStat, ZipCodeSubscription, StatDefinition)
// that were removed in the schema redesign (commit a3f1eec).
// This will be refactored to work with the new jurisdiction-aware data model.

/*
// Get DynamoDB tables from the data resources
const zipCodeStatTable = backend.data.resources.tables['ZipCodeStat'];
const subscriptionsTable = backend.data.resources.tables['ZipCodeSubscription'];
const statDefinitionsTable = backend.data.resources.tables['StatDefinition'];

// Grant the onZipCodeStatUpdate function permissions to read from DynamoDB streams
const streamPolicy = new Policy(
  Stack.of(zipCodeStatTable),
  'OnZipCodeStatUpdateStreamPolicy',
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
        resources: ['*'],
      }),
    ],
  }
);

backend.onZipCodeStatUpdate.resources.lambda.role?.attachInlinePolicy(streamPolicy);

// Grant the onZipCodeStatUpdate function permissions to query subscriptions and stat definitions
const queryPolicy = new Policy(
  Stack.of(zipCodeStatTable),
  'OnZipCodeStatUpdateQueryPolicy',
  {
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
          statDefinitionsTable.tableArn,
          `${statDefinitionsTable.tableArn}/index/*`,
        ],
      }),
    ],
  }
);

backend.onZipCodeStatUpdate.resources.lambda.role?.attachInlinePolicy(queryPolicy);

// Grant the onZipCodeStatUpdate function permissions to invoke sendEmailAlert
const invokeLambdaPolicy = new Policy(
  Stack.of(zipCodeStatTable),
  'OnZipCodeStatUpdateInvokeLambdaPolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [backend.sendEmailAlert.resources.lambda.functionArn],
      }),
    ],
  }
);

backend.onZipCodeStatUpdate.resources.lambda.role?.attachInlinePolicy(invokeLambdaPolicy);

// Grant the sendEmailAlert function permissions to use SES
const sesPolicy = new Policy(
  Stack.of(zipCodeStatTable),
  'SendEmailAlertSESPolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    ],
  }
);

backend.sendEmailAlert.resources.lambda.role?.attachInlinePolicy(sesPolicy);

// Set environment variables for the onZipCodeStatUpdate function
// Cast to LambdaFunction to access addEnvironment method
const onZipCodeStatUpdateLambda = backend.onZipCodeStatUpdate.resources.lambda as LambdaFunction;
onZipCodeStatUpdateLambda.addEnvironment(
  'SUBSCRIPTIONS_TABLE_NAME',
  subscriptionsTable.tableName
);
onZipCodeStatUpdateLambda.addEnvironment(
  'STAT_DEFINITIONS_TABLE_NAME',
  statDefinitionsTable.tableName
);
onZipCodeStatUpdateLambda.addEnvironment(
  'SEND_EMAIL_ALERT_FUNCTION_NAME',
  backend.sendEmailAlert.resources.lambda.functionName
);

// Create DynamoDB Stream event source mapping for ZipCodeStat table
const eventSourceMapping = new EventSourceMapping(
  Stack.of(zipCodeStatTable),
  'ZipCodeStatStreamMapping',
  {
    target: backend.onZipCodeStatUpdate.resources.lambda,
    eventSourceArn: zipCodeStatTable.tableStreamArn,
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    bisectBatchOnError: true,
    retryAttempts: 3,
  }
);

// Ensure the mapping depends on the stream policy
eventSourceMapping.node.addDependency(streamPolicy);
*/

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
const processNotificationsCognitoPolicy = new Policy(processNotificationsStack, 'ProcessNotificationsCognitoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser'],
      resources: [backend.auth.resources.userPool.userPoolArn],
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
// Delete Account Lambda Setup
// ============================================

// Get DynamoDB tables for user data cleanup
const healthRecordTable = backend.data.resources.tables['HealthRecord'];
const hazardReportTable = backend.data.resources.tables['HazardReport'];

// Get the deleteAccount Lambda function and its stack
const deleteAccountLambda = backend.deleteAccount.resources.lambda as LambdaFunction;
const deleteAccountStack = Stack.of(deleteAccountLambda);

// Set environment variables for table names
deleteAccountLambda.addEnvironment('HEALTH_RECORD_TABLE_NAME', healthRecordTable.tableName);
deleteAccountLambda.addEnvironment('USER_SUBSCRIPTION_TABLE_NAME', subscriptionsTable.tableName);
deleteAccountLambda.addEnvironment('NOTIFICATION_LOG_TABLE_NAME', notificationLogTable.tableName);
deleteAccountLambda.addEnvironment('HAZARD_REPORT_TABLE_NAME', hazardReportTable.tableName);
deleteAccountLambda.addEnvironment('USER_POOL_ID', userPoolId);

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
const deleteAccountDynamoPolicy = new Policy(deleteAccountStack, 'DeleteAccountDynamoPolicy', {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:BatchWriteItem',
        'dynamodb:DeleteItem',
      ],
      resources: [
        healthRecordTable.tableArn,
        `${healthRecordTable.tableArn}/index/*`,
        subscriptionsTable.tableArn,
        `${subscriptionsTable.tableArn}/index/*`,
        notificationLogTable.tableArn,
        `${notificationLogTable.tableArn}/index/*`,
        hazardReportTable.tableArn,
        `${hazardReportTable.tableArn}/index/*`,
      ],
    }),
  ],
});
backend.deleteAccount.resources.lambda.role?.attachInlinePolicy(deleteAccountDynamoPolicy);
