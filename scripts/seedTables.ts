import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

type SeedProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
};

type SeedStock = {
  product_id: string;
  count: number;
};

const productsTableName = process.env.PRODUCTS_TABLE_NAME ?? "Products";
const stockTableName = process.env.STOCK_TABLE_NAME ?? "Stock";

const seedProducts: SeedProduct[] = [
  {
    id: "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
    title: "Product Title",
    description: "This product is the first sample seeded item.",
    price: 200,
  },
  {
    id: "6d59c5be-cbe8-4f66-9f1e-8ea9ce6ecf88",
    title: "Mechanical Keyboard",
    description: "Wireless keyboard with tactile switches.",
    price: 120,
  },
  {
    id: "4f32ee36-3cb2-4b7b-9f8d-7f9a7d3a0fd1",
    title: "USB-C Hub",
    description: "Multi-port adapter with HDMI and Ethernet.",
    price: 65,
  },
  {
    id: "4a6ba8d3-ae5f-466d-b6ee-1268db15bf95",
    title: "Noise-Canceling Headphones",
    description: "Over-ear headphones with ANC.",
    price: 210,
  },
  {
    id: "a34a6fc0-204c-4a5a-b8b8-4675f95d0c39",
    title: "Ergonomic Chair",
    description: "Office chair with adjustable lumbar support.",
    price: 340,
  },
];

const seedStocks: SeedStock[] = [
  {
    product_id: "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
    count: 2,
  },
  {
    product_id: "6d59c5be-cbe8-4f66-9f1e-8ea9ce6ecf88",
    count: 9,
  },
  {
    product_id: "4f32ee36-3cb2-4b7b-9f8d-7f9a7d3a0fd1",
    count: 18,
  },
  {
    product_id: "4a6ba8d3-ae5f-466d-b6ee-1268db15bf95",
    count: 6,
  },
  {
    product_id: "a34a6fc0-204c-4a5a-b8b8-4675f95d0c39",
    count: 4,
  },
];

const seed = async () => {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [productsTableName]: seedProducts.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    }),
  );

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [stockTableName]: seedStocks.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    }),
  );

  console.log(
    `Seeded ${seedProducts.length} products into ${productsTableName} and ${seedStocks.length} stock records into ${stockTableName}`,
  );
};

seed().catch((error) => {
  console.error("Failed to seed DynamoDB tables", error);
  process.exit(1);
});
