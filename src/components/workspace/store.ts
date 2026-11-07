import type { WorkspaceProduct } from "./contract";

const STORAGE_KEY = "exportready.workspace.v1";

function readAll(): WorkspaceProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { products?: WorkspaceProduct[] };
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch {
    return [];
  }
}

function writeAll(products: WorkspaceProduct[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ products }));
}

export function readProduct(id: string): WorkspaceProduct | null {
  return readAll().find((product) => product.id === id) ?? null;
}

export function writeProduct(product: WorkspaceProduct) {
  const products = readAll().filter((item) => item.id !== product.id);
  products.push(product);
  writeAll(products);
}

export function mergeProducts(fixtures: readonly WorkspaceProduct[]): WorkspaceProduct[] {
  const saved = readAll();
  const savedById = new Map(saved.map((product) => [product.id, product]));
  const fixtureIds = new Set(fixtures.map((product) => product.id));
  const merged = fixtures.map((product) => savedById.get(product.id) ?? product);
  const extras = saved.filter((product) => !fixtureIds.has(product.id));
  return [...merged, ...extras];
}
