import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class BeAwsJsStack extends Stack {
  public readonly catalogItemsQueue: Queue;

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

    this.catalogItemsQueue = new Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: Duration.seconds(30),
    });

    const createProductTopic = new Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    const notificationEmail =
      this.node.tryGetContext("notificationEmail") ?? "change-me@example.com";

    createProductTopic.addSubscription(
      new EmailSubscription(notificationEmail),
    );

    const catalogBatchProcess = new NodejsFunction(
      this,
      "CatalogBatchProcessLambda",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: "lib/product-service/catalogBatchProcess.ts",
        handler: "handler",
        timeout: Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCK_TABLE_NAME: stockTable.tableName,
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
      },
    );

    catalogBatchProcess.addEventSource(
      new SqsEventSource(this.catalogItemsQueue, {
        batchSize: 5,
      }),
    );

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);
    productsTable.grantWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stockTable.grantWriteData(catalogBatchProcess);
    this.catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

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

    new CfnOutput(this, "CatalogItemsQueueUrl", {
      value: this.catalogItemsQueue.queueUrl,
      description: "Queue URL for catalog item imports",
    });

    new CfnOutput(this, "CreateProductTopicArn", {
      value: createProductTopic.topicArn,
      description: "SNS topic ARN used by catalog batch process",
    });
  }
}
