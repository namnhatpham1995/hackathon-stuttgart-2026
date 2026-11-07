import type { BuyerOverview, BuyerRequestSummary } from "@/lib/buyer/service";

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
