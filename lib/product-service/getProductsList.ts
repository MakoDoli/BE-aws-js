import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

type ProductRecord = {
  id: string;
  title: string;
  description?: string;
  price?: number;
};

type StockRecord = {
  product_id: string;
  count?: number;
};

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;
  const stockTableName = process.env.STOCK_TABLE_NAME;

  if (!productsTableName || !stockTableName) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "DynamoDB table environment variables are not configured",
      }),
    };
  }

  const [productsResult, stockResult] = await Promise.all([
    docClient.send(
      new ScanCommand({
        TableName: productsTableName,
      }),
    ),
    docClient.send(
      new ScanCommand({
        TableName: stockTableName,
      }),
    ),
  ]);

  const products = (productsResult.Items ?? []) as ProductRecord[];
  const stockItems = (stockResult.Items ?? []) as StockRecord[];

  const stockByProductId = new Map(
    stockItems.map((item) => [item.product_id, item.count ?? 0]),
  );

  const joinedProducts = products.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    price: item.price ?? 0,
    count: stockByProductId.get(item.id) ?? 0,
  }));

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(joinedProducts),
  };
};
