import {
  exampleOverview,
  exampleProducts,
  exampleRequests,
  filterExamples,
} from "@/components/buyer/examples";
import {
  type BuyerOverview,
  type BuyerRequestSummary,
  type CatalogProduct,
  type CatalogSearchInput,
  getBuyerOverview,
  getCatalogProduct,
  listMyRequests,
  searchCatalog,
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

export async function loadCatalog(
  userId: string,
  input: CatalogSearchInput,
): Promise<{ products: CatalogProduct[]; example: boolean }> {
  try {
    return { products: await searchCatalog(userId, input), example: false };
  } catch (error) {
    if (!isServiceStub(error)) throw error;
    return { products: filterExamples(input), example: true };
  }
}

export async function loadCatalogProduct(
  userId: string,
  productId: string,
): Promise<{ product: CatalogProduct | null; example: boolean }> {
  try {
    return { product: await getCatalogProduct(userId, productId), example: false };
  } catch (error) {
    if (!isServiceStub(error)) throw error;
    const product = exampleProducts.find((item) => item.productId === productId) ?? null;
    return { product, example: product !== null };
  }
}
