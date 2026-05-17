import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class AuthorizationServiceStack extends Stack {
  public readonly basicAuthorizerLambda: NodejsFunction;
  public readonly basicAuthorizerLambdaArn: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const credentials = Object.fromEntries(
      Object.entries(process.env)
        .filter(([key, value]) => key.length > 0 && value === "TEST_PASSWORD")
        .map(([key, value]) => [key, value as string]),
    );

    this.basicAuthorizerLambda = new NodejsFunction(this, "BasicAuthorizer", {
      runtime: Runtime.NODEJS_20_X,
      entry: "lib/authorization-service/basicAuthorizer.ts",
      handler: "handler",
      timeout: Duration.seconds(5),
      environment:
        Object.keys(credentials).length > 0
          ? credentials
          : {
              GITHUB_LOGIN: "TEST_PASSWORD",
            },
    });

    this.basicAuthorizerLambdaArn = this.basicAuthorizerLambda.functionArn;
  }
}
