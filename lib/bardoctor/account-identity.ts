export function normalizeAccountEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function canResetAccountPassword(
  authenticatedChatGPTEmail: string,
  account: { appEmail: string; chatgptEmail: string },
): boolean {
  const identity = normalizeAccountEmail(authenticatedChatGPTEmail);
  return (
    normalizeAccountEmail(account.chatgptEmail) === identity
    || normalizeAccountEmail(account.appEmail) === identity
  );
}

export function canImportLegacyAccount(
  authenticatedChatGPTEmail: string,
  legacyAccountEmail: string,
): boolean {
  return (
    normalizeAccountEmail(authenticatedChatGPTEmail)
    === normalizeAccountEmail(legacyAccountEmail)
  );
}
