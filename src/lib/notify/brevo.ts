export async function sendBrevoEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ messageId: string }> {
  void input;
  throw new Error("not implemented: sendBrevoEmail");
}
