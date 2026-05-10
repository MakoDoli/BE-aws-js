import { Readable } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import csvParser from "csv-parser";

type S3Record = {
  s3: {
    bucket: { name: string };
    object: { key: string };
  };
};

type S3Event = {
  Records?: S3Record[];
};

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

const normalizeHeader = (header: string): string => {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
};

const normalizeRow = (row: Record<string, unknown>): Record<string, string> => {
  const normalizedEntries = Object.entries(row).map(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    const normalizedValue =
      typeof value === "string" ? value.trim() : String(value ?? "").trim();

    return [normalizedKey, normalizedValue] as const;
  });

  return Object.fromEntries(normalizedEntries);
};

const toReadableStream = (body: unknown): Readable => {
  if (body instanceof Readable) {
    return body;
  }

  if (
    body &&
    typeof body === "object" &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return Readable.fromWeb(body.transformToWebStream() as ReadableStream);
  }

  if (body && typeof body === "object" && Symbol.asyncIterator in body) {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }

  throw new Error("S3 object body is not a supported stream type");
};

export const handler = async (event: S3Event): Promise<void> => {
  const records = event.Records ?? [];
  const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error(
      "CATALOG_ITEMS_QUEUE_URL environment variable is not configured",
    );
  }

  for (const record of records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " "),
    );

    const getObjectResult = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );

    const bodyStream = getObjectResult.Body;

    const readableBody = toReadableStream(bodyStream);
    let sentRowsCount = 0;

    for await (const data of readableBody.pipe(
      csvParser({
        mapHeaders: ({ header }) => normalizeHeader(header),
        skipLines: 0,
      }),
    )) {
      const normalizedData = normalizeRow(data as Record<string, unknown>);

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(normalizedData),
        }),
      );

      sentRowsCount += 1;
    }

    console.log(
      `Parsed and sent ${sentRowsCount} CSV rows from s3://${bucketName}/${objectKey}`,
    );
  }
};
