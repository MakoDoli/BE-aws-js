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

## Deployment and API Gateway URL

Current deployed URL:

```text
https://9puteojvkb.execute-api.us-east-1.amazonaws.com/prod/
```

Deploy the stack:

```bash
npm install
npm run build
npx cdk deploy
```

After deployment, copy the `ProductsApiUrl` output value from terminal.

Example:

```text
ProductsApiUrl = https://9puteojvkb.execute-api.eu-central-1.amazonaws.com/prod/
```

Use this base URL to call lambdas:

- `GET {ProductsApiUrl}products`
- `GET {ProductsApiUrl}products/{productId}`
- `POST {ProductsApiUrl}products`

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
