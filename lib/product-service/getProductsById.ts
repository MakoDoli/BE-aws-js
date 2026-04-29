import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

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

type Event = {
  pathParameters?: {
    productId?: string;
  };
};

export const handler = async (
  event: Event,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const productId = event.pathParameters?.productId;
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;
  const stockTableName = process.env.STOCK_TABLE_NAME;

  if (!productId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "productId path parameter is required" }),
    };
  }

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

  const [productResult, stockResult] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: productsTableName,
        Key: { id: productId },
      }),
    ),
    docClient.send(
      new GetCommand({
        TableName: stockTableName,
        Key: { product_id: productId },
      }),
    ),
  ]);

  const product = productResult.Item as ProductRecord | undefined;
  const stock = stockResult.Item as StockRecord | undefined;

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Product with id "${productId}" not found`,
      }),
    };
  }

  const productWithCount = {
    id: product.id,
    title: product.title,
    description: product.description ?? "",
    price: product.price ?? 0,
    count: stock?.count ?? 0,
  };

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productWithCount),
  };
};
