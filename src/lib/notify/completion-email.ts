export function renderCompletionEmail(input: {
  productId: string;
  issueCount: number;
  appBaseUrl: string;
}): { subject: string; text: string } {
  void input;
  throw new Error("not implemented: renderCompletionEmail");
}

export async function sendCompletionEmail(notificationId: string): Promise<void> {
  void notificationId;
  throw new Error("not implemented: sendCompletionEmail");
}
