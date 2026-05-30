import {
  EXPENSE_CATEGORIES,
  ExpenseInput,
  PAYMENT_METHODS,
  PaginationQuery,
} from "../types";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTP_REGEX = /^\d{6}$/;
const ALLOWED_EXPENSE_FIELDS = [
  "title",
  "amount",
  "category",
  "date",
  "paymentMethod",
  "notes",
] as const;
const ALLOWED_LOGIN_FIELDS = ["username", "password", "totp"] as const;
const ALLOWED_REGISTER_FIELDS = ["username", "email", "password"] as const;
const ALLOWED_FORGOT_PASSWORD_FIELDS = ["email"] as const;
const ALLOWED_RESET_PASSWORD_FIELDS = ["token", "newPassword"] as const;
const ALLOWED_2FA_VERIFY_FIELDS = ["secret", "token"] as const;

export class ValidationError extends Error {
  readonly statusCode = 400;

  constructor(public readonly details: string[]) {
    super("Validation failed");
  }
}

export const validatePaginationQuery = (query: unknown): PaginationQuery => {
  const source = (query ?? {}) as Record<string, unknown>;

  const rawPage = source.page ?? "1";
  const rawLimit = source.limit ?? "10";

  const page = Number(rawPage);
  const limit = Number(rawLimit);

  const errors: string[] = [];

  if (!Number.isInteger(page) || page < 1) {
    errors.push("Query parameter 'page' must be an integer >= 1.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push("Query parameter 'limit' must be an integer between 1 and 100.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return { page, limit };
};

export const validateExpensePayload = (payload: unknown): ExpenseInput => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError(["Body must be a JSON object."]);
  }

  const body = payload as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(body)) {
    if (!ALLOWED_EXPENSE_FIELDS.includes(key as (typeof ALLOWED_EXPENSE_FIELDS)[number])) {
      errors.push(`Unexpected field '${key}'.`);
    }
  }

  const title = getRequiredString(body.title, "title", errors);
  const category = getRequiredString(body.category, "category", errors);
  const date = getRequiredString(body.date, "date", errors);
  const paymentMethod = getRequiredString(body.paymentMethod, "paymentMethod", errors);

  const amount = getRequiredNumber(body.amount, "amount", errors);
  const notes = getOptionalString(body.notes, "notes", errors);

  if (category && !EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    errors.push(`Field 'category' must be one of: ${EXPENSE_CATEGORIES.join(", ")}.`);
  }

  if (
    paymentMethod &&
    !PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])
  ) {
    errors.push(`Field 'paymentMethod' must be one of: ${PAYMENT_METHODS.join(", ")}.`);
  }

  if (date && !ISO_DATE_REGEX.test(date)) {
    errors.push("Field 'date' must be in YYYY-MM-DD format.");
  }

  if (date && Number.isNaN(Date.parse(date))) {
    errors.push("Field 'date' must be a valid date.");
  }

  if (title && title.length > 120) {
    errors.push("Field 'title' must be at most 120 characters.");
  }

  if (notes !== undefined && notes.length > 600) {
    errors.push("Field 'notes' must be at most 600 characters.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  const validated: ExpenseInput = {
    title: title!,
    amount: amount!,
    category: category! as ExpenseInput["category"],
    date: date!,
    paymentMethod: paymentMethod! as ExpenseInput["paymentMethod"],
  };

  if (notes !== undefined) {
    validated.notes = notes;
  }

  return validated;
};

export const validateLoginPayload = (payload: unknown): { username: string; password: string; totp?: string } => {
  const body = assertPlainObject(payload, ALLOWED_LOGIN_FIELDS);
  const errors: string[] = [];

  const username = getRequiredString(body.username, "username", errors);
  const password = getRequiredString(body.password, "password", errors);
  const totp = getOptionalString(body.totp, "totp", errors);

  if (username && username.length > 64) {
    errors.push("Field 'username' must be at most 64 characters.");
  }

  if (password && (password.length < 8 || password.length > 128)) {
    errors.push("Field 'password' must be between 8 and 128 characters.");
  }

  if (totp !== undefined && !TOTP_REGEX.test(totp)) {
    errors.push("Field 'totp' must be a 6-digit code.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  const dto: { username: string; password: string; totp?: string } = {
    username: username!,
    password: password!,
  };

  if (totp !== undefined) {
    dto.totp = totp;
  }

  return dto;
};

export const validateRegisterPayload = (
  payload: unknown,
): { username: string; email: string; password: string } => {
  const body = assertPlainObject(payload, ALLOWED_REGISTER_FIELDS);
  const errors: string[] = [];

  const username = getRequiredString(body.username, "username", errors);
  const email = getRequiredString(body.email, "email", errors);
  const password = getRequiredString(body.password, "password", errors);

  if (username && (username.length < 3 || username.length > 64)) {
    errors.push("Field 'username' must be between 3 and 64 characters.");
  }

  if (email && (email.length > 254 || !EMAIL_REGEX.test(email))) {
    errors.push("Field 'email' must be a valid email address.");
  }

  if (password && (password.length < 8 || password.length > 128)) {
    errors.push("Field 'password' must be between 8 and 128 characters.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return {
    username: username!,
    email: email!,
    password: password!,
  };
};

export const validateForgotPasswordPayload = (payload: unknown): { email: string } => {
  const body = assertPlainObject(payload, ALLOWED_FORGOT_PASSWORD_FIELDS);
  const errors: string[] = [];
  const email = getRequiredString(body.email, "email", errors);

  if (email && (email.length > 254 || !EMAIL_REGEX.test(email))) {
    errors.push("Field 'email' must be a valid email address.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return { email: email! };
};

export const validateResetPasswordPayload = (
  payload: unknown,
): { token: string; newPassword: string } => {
  const body = assertPlainObject(payload, ALLOWED_RESET_PASSWORD_FIELDS);
  const errors: string[] = [];
  const token = getRequiredString(body.token, "token", errors);
  const newPassword = getRequiredString(body.newPassword, "newPassword", errors);

  if (token && token.length > 256) {
    errors.push("Field 'token' must be at most 256 characters.");
  }

  if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) {
    errors.push("Field 'newPassword' must be between 8 and 128 characters.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return { token: token!, newPassword: newPassword! };
};

export const validate2FAVerifyPayload = (payload: unknown): { secret: string; token: string } => {
  const body = assertPlainObject(payload, ALLOWED_2FA_VERIFY_FIELDS);
  const errors: string[] = [];
  const secret = getRequiredString(body.secret, "secret", errors);
  const token = getRequiredString(body.token, "token", errors);

  if (secret && secret.length > 128) {
    errors.push("Field 'secret' must be at most 128 characters.");
  }

  if (token && !TOTP_REGEX.test(token)) {
    errors.push("Field 'token' must be a 6-digit code.");
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return { secret: secret!, token: token! };
};

const getRequiredString = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string | null => {
  if (typeof value !== "string") {
    errors.push(`Field '${fieldName}' is required and must be a string.`);
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    errors.push(`Field '${fieldName}' cannot be empty.`);
    return null;
  }

  return trimmed;
};

const assertPlainObject = (
  payload: unknown,
  allowedFields: readonly string[],
): Record<string, unknown> => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError(["Body must be a JSON object."]);
  }

  const body = payload as Record<string, unknown>;
  const unknownFields = Object.keys(body).filter((key) => !allowedFields.includes(key));

  if (unknownFields.length > 0) {
    throw new ValidationError(unknownFields.map((key) => `Unexpected field '${key}'.`));
  }

  return body;
};

const getOptionalString = (
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`Field '${fieldName}' must be a string when provided.`);
    return undefined;
  }

  return value.trim();
};

const getRequiredNumber = (
  value: unknown,
  fieldName: string,
  errors: string[],
): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`Field '${fieldName}' is required and must be a number.`);
    return null;
  }

  if (value <= 0) {
    errors.push(`Field '${fieldName}' must be greater than 0.`);
    return null;
  }

  return value;
};

