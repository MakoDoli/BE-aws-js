import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class BeAwsJsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, 'GetProductsListLambda', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/product-service/getProductsList.ts',
      handler: 'handler',
      timeout: Duration.seconds(5),
    });

    const getProductsById = new NodejsFunction(this, 'GetProductsByIdLambda', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'lib/product-service/getProductsById.ts',
      handler: 'handler',
      timeout: Duration.seconds(5),
    });

    const api = new RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'OPTIONS'],
        allowHeaders: ['*'],
      },
    });

    const productsResource = api.root.addResource('products');

    productsResource.addMethod('GET', new LambdaIntegration(getProductsList));

    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod('GET', new LambdaIntegration(getProductsById));
  }
}
