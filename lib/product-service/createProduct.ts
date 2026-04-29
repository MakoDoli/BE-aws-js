import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

type Event = {
  body?: string | null;
};

type CreateProductBody = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
};

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const defaultHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (
  event: Event,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;

  if (!productsTableName) {
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({
        message: "PRODUCTS_TABLE_NAME environment variable is not configured",
      }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Request body is required" }),
    };
  }

  let parsedBody: CreateProductBody;

  try {
    parsedBody = JSON.parse(event.body) as CreateProductBody;
  } catch {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Request body must be valid JSON" }),
    };
  }

  const { title, description, price } = parsedBody;

  if (typeof title !== "string" || title.trim().length === 0) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "title is required and must be text" }),
    };
  }

  if (typeof price !== "number" || !Number.isInteger(price)) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({
        message: "price is required and must be an integer",
      }),
    };
  }

  if (description !== undefined && typeof description !== "string") {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({
        message: "description must be text when provided",
      }),
    };
  }

  const product = {
    id: randomUUID(),
    title: title.trim(),
    description: description ?? "",
    price,
  };

  await docClient.send(
    new PutCommand({
      TableName: productsTableName,
      Item: product,
    }),
  );

  return {
    statusCode: 201,
    headers: defaultHeaders,
    body: JSON.stringify(product),
  };
};
