import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

type SqsRecord = {
  body: string;
};

type SqsEvent = {
  Records?: SqsRecord[];
};

type IncomingProduct = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  count?: unknown;
};

type CreatedProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

const isValidPayload = (
  payload: IncomingProduct,
): payload is {
  title: string;
  description?: string;
  price: number;
  count?: number;
} => {
  return (
    typeof payload.title === "string" &&
    payload.title.trim().length > 0 &&
    typeof payload.price === "number" &&
    Number.isInteger(payload.price) &&
    (payload.description === undefined ||
      typeof payload.description === "string") &&
    (payload.count === undefined ||
      (typeof payload.count === "number" && Number.isInteger(payload.count)))
  );
};

export const handler = async (event: SqsEvent): Promise<void> => {
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;
  const stockTableName = process.env.STOCK_TABLE_NAME;
  const createProductTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;

  if (!productsTableName || !stockTableName) {
    throw new Error(
      "PRODUCTS_TABLE_NAME and STOCK_TABLE_NAME environment variables must be configured",
    );
  }

  const records = event.Records ?? [];
  const createdProducts: CreatedProduct[] = [];

  for (const record of records) {
    let parsedBody: IncomingProduct;

    try {
      parsedBody = JSON.parse(record.body) as IncomingProduct;
    } catch {
      continue;
    }

    if (!isValidPayload(parsedBody)) {
      continue;
    }

    const productId = randomUUID();
    const product = {
      id: productId,
      title: parsedBody.title.trim(),
      description: parsedBody.description ?? "",
      price: parsedBody.price,
    };

    const count = parsedBody.count ?? 0;

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: productsTableName,
              Item: product,
            },
          },
          {
            Put: {
              TableName: stockTableName,
              Item: {
                product_id: productId,
                count,
              },
            },
          },
        ],
      }),
    );

    createdProducts.push({
      ...product,
      count,
    });
  }

  if (createdProducts.length > 0 && createProductTopicArn) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: createProductTopicArn,
        Subject: "Products were created from catalog batch",
        Message: JSON.stringify({
          total: createdProducts.length,
          products: createdProducts,
        }),
      }),
    );
  }
};
