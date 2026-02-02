/**
 * Auth Error Utilities
 *
 * Maps Cognito error codes to user-friendly messages.
 * Provides consistent error handling across auth screens.
 */

/**
 * Known Cognito error names/codes
 */
type CognitoErrorCode =
  | "UsernameExistsException"
  | "InvalidPasswordException"
  | "InvalidParameterException"
  | "CodeMismatchException"
  | "ExpiredCodeException"
  | "LimitExceededException"
  | "UserNotFoundException"
  | "NotAuthorizedException"
  | "TooManyRequestsException"
  | "UserNotConfirmedException"

/**
 * User-friendly error messages for signup errors
 */
const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  UsernameExistsException: "An account with this email already exists. Try logging in instead.",
  InvalidPasswordException:
    "Password doesn't meet requirements. Please check the requirements below.",
  InvalidParameterException: "Please check your email format and try again.",
  LimitExceededException: "Too many attempts. Please wait a few minutes before trying again.",
  TooManyRequestsException: "Too many requests. Please wait a moment and try again.",
}

/**
 * User-friendly error messages for confirmation errors
 */
const CONFIRM_ERROR_MESSAGES: Record<string, string> = {
  CodeMismatchException: "The code you entered is incorrect. Please check and try again.",
  ExpiredCodeException: "This code has expired. Please request a new one.",
  LimitExceededException: "Too many attempts. Please wait a few minutes before trying again.",
  TooManyRequestsException: "Too many requests. Please wait a moment and try again.",
  UserNotFoundException: "We couldn't find an account with this email. Please sign up first.",
}

/**
 * User-friendly error messages for login errors
 */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  UserNotFoundException: "No account found with this email. Would you like to sign up?",
  NotAuthorizedException: "Incorrect email or password. Please try again.",
  UserNotConfirmedException: "Please verify your email address before logging in.",
  LimitExceededException: "Too many login attempts. Please wait a few minutes before trying again.",
  TooManyRequestsException: "Too many requests. Please wait a moment and try again.",
}

/**
 * Extract error code from Cognito error
 */
function getErrorCode(error: unknown): CognitoErrorCode | null {
  if (error && typeof error === "object") {
    // Check for 'name' property (standard Cognito errors)
    if ("name" in error && typeof error.name === "string") {
      return error.name as CognitoErrorCode
    }
    // Check for 'code' property (some errors use this)
    if ("code" in error && typeof error.code === "string") {
      return error.code as CognitoErrorCode
    }
  }
  return null
}

/**
 * Get user-friendly message for signup errors
 */
export function getSignupErrorMessage(error: unknown): string {
  const code = getErrorCode(error)
  if (code && SIGNUP_ERROR_MESSAGES[code]) {
    return SIGNUP_ERROR_MESSAGES[code]
  }

  // Check if error message contains password policy info
  const message = error instanceof Error ? error.message : ""
  if (message.toLowerCase().includes("password")) {
    return "Password doesn't meet requirements. Please check the requirements below."
  }

  return "Something went wrong. Please try again."
}

/**
 * Get user-friendly message for confirmation errors
 */
export function getConfirmErrorMessage(error: unknown): string {
  const code = getErrorCode(error)
  if (code && CONFIRM_ERROR_MESSAGES[code]) {
    return CONFIRM_ERROR_MESSAGES[code]
  }

  return "Verification failed. Please check your code and try again."
}

/**
 * Get user-friendly message for login errors
 */
export function getLoginErrorMessage(error: unknown): string {
  const code = getErrorCode(error)
  if (code && LOGIN_ERROR_MESSAGES[code]) {
    return LOGIN_ERROR_MESSAGES[code]
  }

  return "Login failed. Please check your credentials and try again."
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === "LimitExceededException" || code === "TooManyRequestsException"
}

/**
 * Check if error indicates user needs to confirm their email
 */
export function isUnconfirmedUserError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === "UserNotConfirmedException"
}

/**
 * Check if error indicates user already exists
 */
export function isUserExistsError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === "UsernameExistsException"
}

/**
 * Check if error is an expired code error
 */
export function isExpiredCodeError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === "ExpiredCodeException"
}
