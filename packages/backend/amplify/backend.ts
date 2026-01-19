import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import {
  StartingPosition,
  EventSourceMapping,
  Function as LambdaFunction,
} from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendNotifications } from './functions/send-notifications/resource';
import { sendEmailAlert } from './functions/send-email-alert/resource';
import { onZipCodeStatUpdate } from './functions/on-zipcode-stat-update/resource';
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
  onZipCodeStatUpdate,
  // storage,
});

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
