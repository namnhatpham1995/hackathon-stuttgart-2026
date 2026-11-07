import type {
  BuyerOverview,
  BuyerRequestSummary,
  CatalogProduct,
  CatalogSearchInput,
} from "@/lib/buyer/service";

/** Shown only while `src/lib/buyer/service.ts` still throws its contract stubs. */
export const exampleOverview: BuyerOverview = {
  openRequests: 1,
  connectedSuppliers: 1,
  sharedReports: 1,
};

export const exampleRequests: BuyerRequestSummary[] = [
  {
    requestId: "example-cap-104",
    buyerOrgName: "Neckar Maschinenbau GmbH",
    title: "Cover cap CAP-104 rev B",
    partNumber: "CAP-104",
    requirementSetKey: "neckar-cap-104",
    visibility: "direct",
    status: "open",
    createdAt: new Date("2026-11-01T09:00:00Z"),
    connections: [
      {
        connectionId: "example-connection-shared",
        productId: "example-cover-cap",
        productName: "Cover cap",
        partNumber: "CAP-104",
        supplierCompany: "Lotus Mould Co., Ltd.",
        initiatedBy: "buyer",
        status: "shared",
        sharedResultId: "example-result",
        updatedAt: new Date("2026-11-06T15:00:00Z"),
      },
    ],
  },
];

export const exampleProducts: CatalogProduct[] = [
  {
    productId: "example-cover-cap",
    productName: "Cover cap",
    partNumber: "CAP-104",
    profile: {
      companyName: "Lotus Mould Co., Ltd.",
      country: "China",
      productCategory: "Injection moulded caps",
      capabilities: ["Injection moulding", "ABS"],
      targetMarket: "European machinery",
    },
    myConnection: { connectionId: "example-connection-shared", status: "shared" },
  },
  {
    productId: "example-gasket",
    productName: "Housing gasket",
    partNumber: "GSK-220",
    profile: {
      companyName: "Rhein Form GmbH",
      country: "Germany",
      productCategory: "Elastomer seals",
      capabilities: ["Compression moulding"],
      targetMarket: "Industrial equipment",
    },
    myConnection: null,
  },
];

export function filterExamples(input: CatalogSearchInput): CatalogProduct[] {
  const query = input.q?.toLowerCase() ?? "";
  return exampleProducts.filter((product) => {
    if (input.productCategory && product.profile?.productCategory !== input.productCategory) {
      return false;
    }
    if (input.country && product.profile?.country !== input.country) return false;
    if (!query) return true;
    const haystack = [product.productName, product.partNumber, product.profile?.companyName]
      .filter((part) => Boolean(part))
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
