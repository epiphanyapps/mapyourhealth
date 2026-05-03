/**
 * Unit tests for process-notifications pure helpers.
 *
 * These cover the push-recipient grouping logic that fixes the
 * sequential-fan-out performance bug introduced when #123 added
 * state/country scope. The full handler (DynamoDB + Cognito + Lambda
 * invocations) is integration-tested on staging — these tests only
 * exercise the pure grouping helper that decides how many batched
 * sends are issued.
 *
 * Run from this directory: `npx jest --config jest.config.js`
 */

// Mock AWS SDK clients so the handler module can be imported without
// touching the network. The dynamo `send` is exposed so tests of the
// pagination loop (#123) can program multi-page responses.
jest.mock("@aws-sdk/client-dynamodb", () => {
  const send = jest.fn()
  return {
    __dynamoSend: send,
    DynamoDBClient: jest.fn(() => ({ send })),
    QueryCommand: jest.fn((input: unknown) => ({ input })),
    PutItemCommand: jest.fn((input: unknown) => ({ input })),
  }
})
jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn(),
}))
jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: jest.fn() })),
  AdminGetUserCommand: jest.fn(),
}))
// Identity unmarshall — pagination tests feed already-plain Subscription
// objects, so we don't need DynamoDB's AttributeValue → JS coercion.
jest.mock("@aws-sdk/util-dynamodb", () => ({
  unmarshall: (item: unknown) => item,
  marshall: jest.fn(),
}))

import { groupPushRecipients, querySubscriptionsAllPages, type Subscription } from "./handler"

// Grab the dynamo `send` mock injected via the jest.mock factory above.
const dynamoSendMock = (
  jest.requireMock("@aws-sdk/client-dynamodb") as { __dynamoSend: jest.Mock }
).__dynamoSend

function makeSub(overrides: Partial<Subscription>): Subscription {
  return {
    id: "sub-default",
    owner: "user-default",
    city: "Montreal",
    state: "QC",
    country: "CA",
    enablePush: true,
    enableEmail: false,
    alertOnDanger: true,
    alertOnWarning: false,
    alertOnAnyChange: false,
    notifyWhenDataAvailable: false,
    expoPushToken: "ExponentPushToken[default]",
    ...overrides,
  }
}

function makeRecipient(token: string, sub: Partial<Subscription>) {
  return { token, subscription: makeSub({ expoPushToken: token, ...sub }) }
}

describe("groupPushRecipients (#123 fan-out batching)", () => {
  const origin = { city: "Montreal", state: "QC", country: "CA" }

  it("returns an empty array when there are no recipients", () => {
    expect(groupPushRecipients([], "city", origin, "lead")).toEqual([])
    expect(groupPushRecipients([], "state", origin, "lead")).toEqual([])
    expect(groupPushRecipients([], "country", origin, "lead")).toEqual([])
  })

  it("collapses every city-scope recipient into ONE batch with the origin deep-link", () => {
    // Critical regression test: city-scope used to be one batched send;
    // a sequential per-subscriber loop would have N groups here.
    const recipients = [
      makeRecipient("tok-A", { id: "s1", city: "Montreal" }),
      makeRecipient("tok-B", { id: "s2", city: "Montreal" }),
      makeRecipient("tok-C", { id: "s3", city: "Montreal" }),
    ]

    const groups = groupPushRecipients(recipients, "city", origin, "lead")

    expect(groups).toHaveLength(1)
    expect(groups[0].tokens).toEqual(["tok-A", "tok-B", "tok-C"])
    expect(groups[0].data).toEqual({
      screen: "Dashboard",
      city: "Montreal",
      state: "QC",
      country: "CA",
      contaminantId: "lead",
    })
    expect(groups[0].subscriptions).toHaveLength(3)
  })

  it("groups state-scope recipients by their own city (one batch per distinct subscriber city)", () => {
    // For state-scope fan-out, every subscriber gets a deep-link to
    // their OWN dashboard, but recipients in the same city share the
    // same payload — so we batch per-city rather than per-recipient.
    const recipients = [
      makeRecipient("tok-MTL-1", { id: "s1", city: "Montreal", state: "QC", country: "CA" }),
      makeRecipient("tok-MTL-2", { id: "s2", city: "Montreal", state: "QC", country: "CA" }),
      makeRecipient("tok-QBC-1", { id: "s3", city: "Quebec City", state: "QC", country: "CA" }),
      makeRecipient("tok-LAV-1", { id: "s4", city: "Laval", state: "QC", country: "CA" }),
      makeRecipient("tok-LAV-2", { id: "s5", city: "Laval", state: "QC", country: "CA" }),
    ]

    const groups = groupPushRecipients(
      recipients,
      "state",
      { city: null, state: "QC", country: "CA" },
      "radon",
    )

    // 5 recipients, 3 distinct cities → 3 batched sends, not 5.
    expect(groups).toHaveLength(3)

    const byCity = new Map(groups.map((g) => [g.data.city as string, g]))
    expect(byCity.get("Montreal")!.tokens.sort()).toEqual(["tok-MTL-1", "tok-MTL-2"])
    expect(byCity.get("Quebec City")!.tokens).toEqual(["tok-QBC-1"])
    expect(byCity.get("Laval")!.tokens.sort()).toEqual(["tok-LAV-1", "tok-LAV-2"])

    // Every group's deep-link points at the subscriber's own city,
    // not the (null) origin city.
    for (const g of groups) {
      expect(g.data.contaminantId).toBe("radon")
      expect(g.data.state).toBe("QC")
      expect(g.data.country).toBe("CA")
      expect(g.data.screen).toBe("Dashboard")
    }
  })

  it("groups country-scope recipients across states by (city, state, country)", () => {
    // Country-scope fan-out can include subscribers in different states.
    // Two cities with the same name in different states must NOT share
    // a batch — the deep-link state would be wrong for half of them.
    const recipients = [
      makeRecipient("tok-Spr-IL-1", { id: "s1", city: "Springfield", state: "IL", country: "US" }),
      makeRecipient("tok-Spr-IL-2", { id: "s2", city: "Springfield", state: "IL", country: "US" }),
      makeRecipient("tok-Spr-MA-1", { id: "s3", city: "Springfield", state: "MA", country: "US" }),
      makeRecipient("tok-NYC-1", { id: "s4", city: "New York", state: "NY", country: "US" }),
    ]

    const groups = groupPushRecipients(
      recipients,
      "country",
      { city: null, state: null, country: "US" },
      undefined,
    )

    // Same-name cities in different states get separate batches → 3 groups.
    expect(groups).toHaveLength(3)

    const findGroup = (city: string, state: string) =>
      groups.find((g) => g.data.city === city && g.data.state === state)

    expect(findGroup("Springfield", "IL")!.tokens.sort()).toEqual([
      "tok-Spr-IL-1",
      "tok-Spr-IL-2",
    ])
    expect(findGroup("Springfield", "MA")!.tokens).toEqual(["tok-Spr-MA-1"])
    expect(findGroup("New York", "NY")!.tokens).toEqual(["tok-NYC-1"])
  })

  it("preserves subscription identity in each group for downstream logging", () => {
    // The handler logs one NotificationLog row per recipient using the
    // subscription's own city/state/country. The grouper must not lose
    // the original Subscription objects.
    const recipients = [
      makeRecipient("tok-1", { id: "s1", city: "Toronto", state: "ON", country: "CA" }),
      makeRecipient("tok-2", { id: "s2", city: "Toronto", state: "ON", country: "CA" }),
    ]

    const groups = groupPushRecipients(
      recipients,
      "country",
      { city: null, state: null, country: "CA" },
      undefined,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].subscriptions.map((s) => s.id).sort()).toEqual(["s1", "s2"])
  })

  it("city scope ignores subscriber location and uses the origin payload (verifies city-scope short-circuit)", () => {
    // If the grouper accidentally applied the state/country grouping
    // logic to city-scope events, recipients in different cities would
    // get split across multiple batches.
    const recipients = [
      makeRecipient("tok-1", { id: "s1", city: "Anywhere-1", state: "QC", country: "CA" }),
      makeRecipient("tok-2", { id: "s2", city: "Anywhere-2", state: "QC", country: "CA" }),
    ]

    const groups = groupPushRecipients(recipients, "city", origin, "arsenic")

    expect(groups).toHaveLength(1)
    expect(groups[0].data.city).toBe("Montreal") // the origin, not the subscriber
    expect(groups[0].tokens.sort()).toEqual(["tok-1", "tok-2"])
  })

  it("does NOT collide when subscriber city contains the legacy pipe separator", () => {
    // Regression: the previous key `${city}|${state}|${country}` would
    // collide for the rare bilingual cities like
    // "Sault Ste. Marie | Sainte-Sault-Marie". JSON.stringify keying
    // disambiguates even when the literal field value contains `|`.
    const recipients = [
      makeRecipient("tok-pipe", { id: "s1", city: "A|B", state: "X", country: "CA" }),
      // Naively concatenating with `|` would produce the same key as the row above.
      makeRecipient("tok-shadow", { id: "s2", city: "A", state: "B|X", country: "CA" }),
    ]

    const groups = groupPushRecipients(
      recipients,
      "country",
      { city: null, state: null, country: "CA" },
      undefined,
    )

    // Two distinct (city, state) tuples → two batches.
    expect(groups).toHaveLength(2)
  })

  // Pagination loop tests live in their own describe below.

  it("scales to thousands of recipients with bounded group count", () => {
    // Country-scope fan-out is the worst case. 10,000 subscribers
    // distributed across 50 cities → 50 groups, NOT 10,000 sequential
    // sends. This is the correctness condition that prevents the
    // Lambda 15-min timeout.
    const cities = Array.from({ length: 50 }, (_, i) => `City-${i}`)
    const recipients = Array.from({ length: 10_000 }, (_, i) =>
      makeRecipient(`tok-${i}`, {
        id: `s-${i}`,
        city: cities[i % cities.length],
        state: "CA",
        country: "US",
      }),
    )

    const groups = groupPushRecipients(
      recipients,
      "country",
      { city: null, state: null, country: "US" },
      undefined,
    )

    expect(groups).toHaveLength(50)
    const total = groups.reduce((sum, g) => sum + g.tokens.length, 0)
    expect(total).toBe(10_000)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// querySubscriptionsAllPages — DynamoDB LastEvaluatedKey loop (#123 C3)
// ─────────────────────────────────────────────────────────────────────────
//
// Critical: a single DynamoDB Query response is capped at 1MB. Without
// the LastEvaluatedKey loop, country-scope fan-out would silently drop
// every subscriber past the first ~1MB page. These tests pin the loop
// behaviour so a future refactor can't quietly regress it.

describe("querySubscriptionsAllPages (#123 fan-out pagination)", () => {
  beforeEach(() => {
    dynamoSendMock.mockReset()
  })

  it("returns the single page when DynamoDB has no LastEvaluatedKey", async () => {
    dynamoSendMock.mockResolvedValueOnce({
      Items: [{ id: "s1" }, { id: "s2" }],
      LastEvaluatedKey: undefined,
    })

    const subs = await querySubscriptionsAllPages({
      TableName: "x",
      IndexName: "userSubscriptionsByCountry",
      KeyConditionExpression: "country = :c",
      ExpressionAttributeValues: { ":c": { S: "CA" } },
    })

    expect(subs).toHaveLength(2)
    expect(dynamoSendMock).toHaveBeenCalledTimes(1)
  })

  it("aggregates results across multiple pages until LastEvaluatedKey is exhausted", async () => {
    // Three pages: 2 + 2 + 1 = 5 subscriptions. The loop must call
    // dynamo.send() three times, threading LastEvaluatedKey forward.
    dynamoSendMock
      .mockResolvedValueOnce({
        Items: [{ id: "s1" }, { id: "s2" }],
        LastEvaluatedKey: { id: { S: "s2" } },
      })
      .mockResolvedValueOnce({
        Items: [{ id: "s3" }, { id: "s4" }],
        LastEvaluatedKey: { id: { S: "s4" } },
      })
      .mockResolvedValueOnce({
        Items: [{ id: "s5" }],
        LastEvaluatedKey: undefined,
      })

    const subs = await querySubscriptionsAllPages({
      TableName: "x",
      IndexName: "userSubscriptionsByCountry",
      KeyConditionExpression: "country = :c",
      ExpressionAttributeValues: { ":c": { S: "CA" } },
    })

    expect(subs.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4", "s5"])
    expect(dynamoSendMock).toHaveBeenCalledTimes(3)

    // The second and third QueryCommands must carry the previous page's
    // LastEvaluatedKey as ExclusiveStartKey, otherwise the loop would
    // re-fetch page 1 forever (or never advance, depending on DDB).
    const secondInput = (dynamoSendMock.mock.calls[1][0] as { input: { ExclusiveStartKey?: unknown } })
      .input
    const thirdInput = (dynamoSendMock.mock.calls[2][0] as { input: { ExclusiveStartKey?: unknown } })
      .input
    expect(secondInput.ExclusiveStartKey).toEqual({ id: { S: "s2" } })
    expect(thirdInput.ExclusiveStartKey).toEqual({ id: { S: "s4" } })
  })

  it("handles an empty result set without spinning", async () => {
    dynamoSendMock.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })

    const subs = await querySubscriptionsAllPages({
      TableName: "x",
      IndexName: "userSubscriptionsByCountry",
      KeyConditionExpression: "country = :c",
      ExpressionAttributeValues: { ":c": { S: "ZZ" } },
    })

    expect(subs).toEqual([])
    expect(dynamoSendMock).toHaveBeenCalledTimes(1)
  })
})
