type Item = { id: string; name: string; stock: number };

let MOCK_DB: Item[] = [
  { id: "1", name: "Super Widget A", stock: 10 },
  { id: "2", name: "Mega Widget B", stock: 0 },
  { id: "3", name: "Wonder Widget C", stock: 5 },
  { id: "4", name: "Hyper Widget D", stock: 2 },
];

export async function getInventory(): Promise<Item[]> {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  if (Math.random() < 0.2) {
    throw new Error("500: Random Legacy API Failure");
  }
  return MOCK_DB;
}

export async function claimStock(id: string) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const item = MOCK_DB.find((i) => i.id === id);
  if (!item) throw new Error("Item not found");
  if (item.stock <= 0) throw new Error("Out of stock");
  item.stock -= 1;
  return item;
}
