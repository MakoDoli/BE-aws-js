import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type ApiGatewayEvent = {
  queryStringParameters?: Record<string, string | undefined> | null;
};

const defaultHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

const s3Client = new S3Client({});

export const handler = async (
  event: ApiGatewayEvent,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const bucketName = process.env.IMPORT_BUCKET_NAME;

  if (!bucketName) {
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({
        message: "IMPORT_BUCKET_NAME environment variable is not configured",
      }),
    };
  }

  const fileName =
    event.queryStringParameters?.name ?? event.queryStringParameters?.fileName;

  if (!fileName || fileName.trim().length === 0) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({
        message: "Query parameter 'name' is required",
      }),
    };
  }

  const objectKey = `uploaded/${fileName.trim()}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: "text/csv",
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return {
    statusCode: 200,
    headers: defaultHeaders,
    body: JSON.stringify({ signedUrl }),
  };
};
