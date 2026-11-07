import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { GET as getProduct, PATCH } from "@/app/api/products/[productId]/route";
import { GET, POST } from "@/app/api/products/route";
import { db } from "@/db/client";
import { product } from "@/db/schema";
import { auth } from "@/lib/auth";

const password = "correct-horse-1";

async function createUser(name: string) {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: result.user.id, email };
}

async function sessionCookie(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  const parts = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  if (parts.length === 0) throw new Error("sign-in did not set a session cookie");
  return parts.join("; ");
}

const lotus = {
  name: "Cover cap",
  requirementSetKey: "neckar-cap-104",
  requirementSetVersion: 1,
  profile: {
    companyName: "Lotus Mould Co., Ltd.",
    country: "Vietnam",
    productCategory: "Plastic components",
    capabilities: ["Injection moulding"],
    targetMarket: "Germany",
  },
  fields: {
    supplierName: { value: "Lotus Mould Co., Ltd.", origin: "user" },
    partNumber: { value: "CAP-104", origin: "user" },
    revision: { value: "B", origin: "user" },
    material: { value: "ABS", origin: "user" },
    packaging: { value: "PKG-07", origin: "user" },
  },
};

describe("product API", () => {
  test("create and list persist the supplier profile for the signed-in user only", async () => {
    const owner = await createUser("Ada");
    const other = await createUser("Bea");
    const cookie = await sessionCookie(owner.email);

    const unauthenticated = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lotus),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const created = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify(lotus),
      }),
    );
    expect(created.status).toBe(201);
    const productView = (await created.json()) as { id: string; stored: boolean; profile: unknown };
    expect(productView.stored).toBe(true);
    expect(productView.profile).toMatchObject({
      companyName: "Lotus Mould Co., Ltd.",
      capabilities: ["Injection moulding"],
    });

    const rows = await db.select().from(product).where(eq(product.id, productView.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(owner.id);
    expect(rows[0]?.profile).toMatchObject({ companyName: "Lotus Mould Co., Ltd." });

    const listed = await GET(new Request("http://localhost/api/products", { headers: { cookie } }));
    expect(listed.status).toBe(200);
    const list = (await listed.json()) as { products: { id: string }[] };
    expect(list.products.map((item) => item.id)).toContain(productView.id);

    const hidden = await GET(
      new Request("http://localhost/api/products", {
        headers: { cookie: await sessionCookie(other.email) },
      }),
    );
    const hiddenBody = await hidden.text();
    expect(hiddenBody).not.toContain(productView.id);
    expect(hiddenBody).not.toContain("Lotus Mould");

    const foreign = await getProduct(
      new Request(`http://localhost/api/products/${productView.id}`, {
        headers: { cookie: await sessionCookie(other.email) },
      }),
      { params: Promise.resolve({ productId: productView.id }) },
    );
    expect(foreign.status).toBe(404);
    const foreignBody = await foreign.text();
    expect(foreignBody).not.toContain("Lotus Mould");
    expect(foreignBody).not.toContain("CAP-104");
  });

  test("a draft update keeps an unchanged assistant origin and stores a changed field as the user", async () => {
    const owner = await createUser("Ada");
    const cookie = await sessionCookie(owner.email);
    const created = await POST(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          ...lotus,
          fields: {
            ...lotus.fields,
            revision: { value: "B", origin: "assistant" },
          },
        }),
      }),
    );
    const productView = (await created.json()) as { id: string };

    const saved = await PATCH(
      new Request(`http://localhost/api/products/${productView.id}`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          name: "Cover cap",
          supplierName: "Lotus Mould Co., Ltd.",
          partNumber: "CAP-104",
          revision: "B",
          material: "ABS",
          packaging: "PKG-08",
        }),
      }),
      { params: Promise.resolve({ productId: productView.id }) },
    );
    expect(saved.status).toBe(200);
    const body = (await saved.json()) as {
      fields: { revision?: { origin: string }; packaging?: { value: string; origin: string } };
    };
    expect(body.fields.revision).toEqual({ value: "B", origin: "assistant" });
    expect(body.fields.packaging).toEqual({ value: "PKG-08", origin: "user" });
  });
});
