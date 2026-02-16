import { Suspense } from "react";
import {
  Await,
  useFetcher,
  useRevalidator,
  isRouteErrorResponse,
  data,
} from "react-router";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Button,
  Banner,
  SkeletonBodyText,
  Text,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { getInventory, claimStock } from "~/models/inventory.server";
import type { Route } from "./+types/dashboard";

// --- Loader: defer inventory promise for streaming ---
export function loader() {
  return { inventory: getInventory() };
}

// --- Action: handle claim stock mutations ---
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const id = formData.get("id") as string;
  const currentStock = Number(formData.get("currentStock"));

  try {
    const updated = await claimStock(id);
    return data({ ok: true, item: updated });
  } catch (error) {
    return data(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        restoredStock: currentStock,
      },
      { status: 400 }
    );
  }
}

// --- Inventory Row with Optimistic UI via useFetcher ---
function InventoryRow({
  item,
}: {
  item: { id: string; name: string; stock: number };
}) {
  const fetcher = useFetcher<typeof action>();

  // Optimistic stock: if a submission is pending, show stock - 1
  const isSubmitting = fetcher.state !== "idle";
  const optimisticStock =
    fetcher.formData && fetcher.state === "submitting"
      ? Number(fetcher.formData.get("currentStock")) - 1
      : item.stock;

  // If server returned error, the real stock is already in loader data (revalidated)
  const displayStock = optimisticStock;
  const isOutOfStock = displayStock <= 0;

  return (
    <IndexTable.Row id={item.id} position={Number(item.id)}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {item.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text
          as="span"
          variant="bodyMd"
          tone={isOutOfStock ? "critical" : undefined}
        >
          {displayStock}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="currentStock" value={item.stock} />
          <Button
            submit
            disabled={isOutOfStock || isSubmitting}
            loading={isSubmitting}
            variant="primary"
            size="slim"
          >
            Claim One
          </Button>
        </fetcher.Form>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}

// --- Inventory Table ---
function InventoryTable({
  items,
}: {
  items: { id: string; name: string; stock: number }[];
}) {
  return (
    <IndexTable
      resourceName={{ singular: "item", plural: "items" }}
      itemCount={items.length}
      headings={[
        { title: "Product" },
        { title: "Stock" },
        { title: "Actions" },
      ]}
      selectable={false}
    >
      {items.map((item) => (
        <InventoryRow key={item.id} item={item} />
      ))}
    </IndexTable>
  );
}

// --- Main Dashboard Component ---
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <Page title="Inventory Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <Suspense fallback={<LoadingSkeleton />}>
              <Await resolve={loaderData.inventory}>
                {(items) => <InventoryTable items={items} />}
              </Await>
            </Suspense>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// --- Loading Skeleton ---
function LoadingSkeleton() {
  return (
    <BlockStack gap="400">
      <SkeletonBodyText lines={4} />
      <SkeletonBodyText lines={4} />
    </BlockStack>
  );
}

// --- Error Boundary: contains blast radius to inventory area ---
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";

  let message = "Failed to load inventory data.";
  if (isRouteErrorResponse(error)) {
    message = error.data || error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Page title="Inventory Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Banner title="Inventory Load Error" tone="critical">
                <p>{message}</p>
              </Banner>
              <InlineStack align="start">
                <Button
                  onClick={() => revalidator.revalidate()}
                  loading={isRevalidating}
                  variant="primary"
                >
                  Retry
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
