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

    if (!(bodyStream instanceof Readable)) {
      throw new Error("S3 object body is not a readable stream");
    }

    for await (const data of bodyStream.pipe(csvParser())) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(data),
        }),
      );
    }
  }
};
