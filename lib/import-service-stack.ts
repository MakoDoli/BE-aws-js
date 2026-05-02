import {
  Duration,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { EventType } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const importBucket = new Bucket(this, "ImportProductsBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Creates the uploaded/ prefix in the bucket.
    new s3deploy.BucketDeployment(this, "UploadedFolderDeployment", {
      destinationBucket: importBucket,
      sources: [s3deploy.Source.data("uploaded/.keep", "")],
      retainOnDelete: false,
    });

    const importProductsFile = new NodejsFunction(
      this,
      "ImportProductsFileLambda",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: "lib/import-service/importProductsFile.ts",
        handler: "handler",
        timeout: Duration.seconds(5),
        environment: {
          IMPORT_BUCKET_NAME: importBucket.bucketName,
        },
      },
    );

    const importFileParser = new NodejsFunction(
      this,
      "ImportFileParserLambda",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: "lib/import-service/importFileParser.ts",
        handler: "handler",
        timeout: Duration.seconds(30),
        environment: {
          IMPORT_BUCKET_NAME: importBucket.bucketName,
        },
      },
    );

    importBucket.grantReadWrite(importProductsFile);
    importBucket.grantRead(importFileParser);

    importBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(importFileParser),
      {
        prefix: "uploaded/",
      },
    );

    const api = new RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["*"],
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod("GET", new LambdaIntegration(importProductsFile));

    new CfnOutput(this, "ImportApiUrl", {
      value: api.url,
      description: "Base URL for Import Service API",
    });

    new CfnOutput(this, "ImportBucketName", {
      value: importBucket.bucketName,
      description: "Bucket used to upload import CSV files",
    });
  }
}
