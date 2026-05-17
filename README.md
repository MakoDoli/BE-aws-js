# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Implemented Product Service Tasks

- DynamoDB tables are defined in CDK:
  - `Products` table with primary key `id` (string UUID)
  - `Stock` table with primary key `product_id` (string UUID)
- Seed script is available in `scripts/seedTables.ts`.
- Product API is wired with:
  - `GET /products`
  - `GET /products/{productId}`
  - `POST /products`

## Implemented Import Service Tasks

- Separate CDK stack `ImportServiceStack` added alongside product stack.
- S3 bucket is created for imports and includes `uploaded/` prefix.
- Import API is wired with:
  - `GET /import?name={fileName}.csv`
- Lambda functions in import service:
  - `importProductsFile`: returns a pre-signed S3 URL for key `uploaded/{fileName}`
  - `importFileParser`: triggered on `s3:ObjectCreated:*` for files in `uploaded/`, streams and parses CSV rows with `csv-parser`, logs rows to CloudWatch

## Implemented Authorization Service Tasks

- Separate CDK stack `AuthorizationServiceStack` added.
- `basicAuthorizer` lambda is added in `lib/authorization-service/basicAuthorizer.ts`.
- Import API `GET /import` is protected by a custom Lambda authorizer.
- Authorizer behavior:
  - missing `Authorization` header -> API returns `401`
  - invalid credentials -> API returns `403`
  - valid credentials -> request is allowed

### Credentials via .env

Create `.env` with your GitHub login as key and `TEST_PASSWORD` as value:

```text
YOUR_GITHUB_LOGIN=TEST_PASSWORD
```

`.env` is included in `.gitignore` and is not committed.

Authorization token format for the client:

```text
Authorization: Basic {authorization_token}
```

`authorization_token` must be base64 of:

```text
YOUR_GITHUB_LOGIN:TEST_PASSWORD
```

Example:

```text
Authorization: Basic TWFrb0RvbGk6VEVTVF9QQVNTV09SRA==
```

Client-side request example:

```ts
const authorization_token = localStorage.getItem("authorization_token");

await fetch(`${importApiUrl}import?name=products.csv`, {
  method: "GET",
  headers: {
    Authorization: `Basic ${authorization_token}`,
  },
});
```

## Deployment and API Gateway URL

Current deployed URL:

```text
https://9puteojvkb.execute-api.us-east-1.amazonaws.com/prod/
```

## Quick API Links

- Product Service base URL:
  - https://9puteojvkb.execute-api.us-east-1.amazonaws.com/prod/
- Import Service base URL:
  - https://wtzerlzpal.execute-api.us-east-1.amazonaws.com/prod/
- Product Service API (list products):
  - https://9puteojvkb.execute-api.us-east-1.amazonaws.com/prod/products
- Import Service API (generate signed URL):
  - https://wtzerlzpal.execute-api.us-east-1.amazonaws.com/prod/import?name=products.csv
- Catalog Items Queue URL:
  - https://sqs.us-east-1.amazonaws.com/650810417883/catalogItemsQueue

Deploy the stack:

```bash
npm install
npm run build
npx cdk deploy
```

After deployment, copy the `ProductsApiUrl` output value from terminal.

Also copy:

- `ImportApiUrl`
- `ImportBucketName`

Example:

```text
ProductsApiUrl = https://9puteojvkb.execute-api.eu-central-1.amazonaws.com/prod/
```

Use this base URL to call lambdas:

- `GET {ProductsApiUrl}products`
- `GET {ProductsApiUrl}products/{productId}`
- `POST {ProductsApiUrl}products`
- `GET {ImportApiUrl}import?name=products.csv`

## Import Flow Verification

1. Request signed URL:

```bash
curl "{ImportApiUrl}import?name=products.csv"
```

2. Upload CSV using returned URL (`signedUrl` from response body):

```bash
curl -X PUT "{signedUrl}" \
  -H "Content-Type: text/csv" \
  --data-binary "title,description,price,count
Product A,From import,100,5"
```

3. Check CloudWatch logs for `ImportFileParserLambda` to see parsed rows.

## Seed DynamoDB Tables

Run:

```bash
npm run seed
```

This inserts sample records into `Products` and `Stock` tables.

## Example Requests

Get products:

```bash
curl {ProductsApiUrl}products
```

Create product:

```bash
curl -X POST {ProductsApiUrl}products \
	-H "Content-Type: application/json" \
	-d '{"title":"New Product","description":"Created via API","price":150}'
```

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
