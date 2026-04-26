import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class BeAwsJsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsTable = new Table(this, "ProductsTable", {
      tableName: "Products",
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const stockTable = new Table(this, "StockTable", {
      tableName: "Stock",
      partitionKey: { name: "product_id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const getProductsList = new NodejsFunction(this, "GetProductsListLambda", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lib/product-service/getProductsList.ts",
      handler: "handler",
      timeout: Duration.seconds(5),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const getProductsById = new NodejsFunction(this, "GetProductsByIdLambda", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lib/product-service/getProductsById.ts",
      handler: "handler",
      timeout: Duration.seconds(5),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    const createProduct = new NodejsFunction(this, "CreateProductLambda", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lib/product-service/createProduct.ts",
      handler: "handler",
      timeout: Duration.seconds(5),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
      },
    });

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);
    productsTable.grantWriteData(createProduct);

    const api = new RestApi(this, "ProductsApi", {
      restApiName: "Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["*"],
      },
    });

    const productsResource = api.root.addResource("products");

    productsResource.addMethod("GET", new LambdaIntegration(getProductsList));
    productsResource.addMethod("POST", new LambdaIntegration(createProduct));

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new LambdaIntegration(getProductsById),
    );

    new CfnOutput(this, "ProductsApiUrl", {
      value: api.url,
      description: "Base URL for Product Service API",
    });
  }
}
