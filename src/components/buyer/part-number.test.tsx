// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
vi.mock("@/app/buyer/actions", () => ({ requestProductEvidence: vi.fn(), closeRequest: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { Catalog } from "./catalog";
import { ProductDetail } from "./product-detail";
import { RequestsHome } from "./requests-home";
import { exampleProducts, exampleRequests } from "./examples";

test("catalogue, detail and request part numbers allow an unbroken 80-character value to wrap", () => {
  const partNumber = "P".repeat(80);
  const [exampleProduct] = exampleProducts;
  const [exampleRequest] = exampleRequests;
  if (!exampleProduct || !exampleRequest) throw new Error("Expected buyer examples");
  const product = { ...exampleProduct, partNumber };
  const request = { ...exampleRequest, partNumber, connections: [] };
  const views = [
    <Catalog
      products={[product]}
      example={false}
      values={{ q: "", productCategory: "", country: "" }}
      error={null}
    />,
    <ProductDetail product={product} example={false} />,
    <RequestsHome
      overview={{ openRequests: 1, connectedSuppliers: 0, sharedReports: 0 }}
      requests={[request]}
      example={false}
    />,
  ];
  for (const view of views) {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(view);
    const number = [...container.querySelectorAll("p,span")].find(
      (element) => element.textContent === partNumber,
    );
    expect(number).toBeDefined();
    expect(number?.classList.contains("whitespace-nowrap")).toBe(false);
    expect(number?.classList.contains("break-all")).toBe(true);
  }
});
