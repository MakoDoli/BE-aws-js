import { Readable } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

export const handler = async (event: S3Event): Promise<void> => {
  const records = event.Records ?? [];

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

    await new Promise<void>((resolve, reject) => {
      bodyStream
        .pipe(csvParser())
        .on("data", (data) => {
          console.log("Parsed CSV record:", data);
        })
        .on("end", () => {
          console.log(`Finished parsing file: ${objectKey}`);
          resolve();
        })
        .on("error", reject);
    });
  }
};
