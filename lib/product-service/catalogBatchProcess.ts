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
  name?: unknown;
  description?: unknown;
  desc?: unknown;
  price?: unknown;
  cost?: unknown;
  count?: unknown;
  quantity?: unknown;
};

type NormalizedIncomingProduct = {
  title: string;
  description?: string;
  price: number;
  count?: number;
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

const parseInteger = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizePayload = (
  payload: IncomingProduct,
): NormalizedIncomingProduct | undefined => {
  const titleSource = payload.title ?? payload.name;
  const descriptionSource = payload.description ?? payload.desc;
  const priceSource = payload.price ?? payload.cost;
  const countSource = payload.count ?? payload.quantity;

  if (typeof titleSource !== "string" || titleSource.trim().length === 0) {
    return undefined;
  }

  if (
    descriptionSource !== undefined &&
    typeof descriptionSource !== "string"
  ) {
    return undefined;
  }

  const parsedPrice = parseInteger(priceSource);
  if (parsedPrice === undefined) {
    return undefined;
  }

  let parsedCount: number | undefined;
  if (countSource !== undefined && countSource !== "") {
    parsedCount = parseInteger(countSource);
    if (parsedCount === undefined) {
      return undefined;
    }
  }

  return {
    title: titleSource.trim(),
    description: descriptionSource,
    price: parsedPrice,
    count: parsedCount,
  };
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
  let invalidRowsCount = 0;

  for (const record of records) {
    let parsedBody: IncomingProduct;

    try {
      parsedBody = JSON.parse(record.body) as IncomingProduct;
    } catch {
      invalidRowsCount += 1;
      console.warn("Skipped SQS record with invalid JSON body");
      continue;
    }

    const normalized = normalizePayload(parsedBody);

    if (!normalized) {
      invalidRowsCount += 1;
      console.warn(
        "Skipped SQS record due to invalid product payload",
        parsedBody,
      );
      continue;
    }

    const productId = randomUUID();
    const product = {
      id: productId,
      title: normalized.title,
      description: normalized.description ?? "",
      price: normalized.price,
    };

    const count = normalized.count ?? 0;

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

  console.log(
    `Catalog batch finished: created=${createdProducts.length}, skipped=${invalidRowsCount}, received=${records.length}`,
  );

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
