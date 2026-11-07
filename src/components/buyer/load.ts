import { exampleOverview, exampleRequests } from "@/components/buyer/examples";
import {
  type BuyerOverview,
  type BuyerRequestSummary,
  getBuyerOverview,
  listMyRequests,
} from "@/lib/buyer/service";

export function isServiceStub(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("not implemented:");
}

export async function loadBuyerHome(userId: string): Promise<{
  overview: BuyerOverview;
  requests: BuyerRequestSummary[];
  example: boolean;
}> {
  try {
    const [overview, requests] = await Promise.all([
      getBuyerOverview(userId),
      listMyRequests(userId),
    ]);
    return { overview, requests, example: false };
  } catch (error) {
    if (!isServiceStub(error)) throw error;
    return { overview: exampleOverview, requests: exampleRequests, example: true };
  }
}
