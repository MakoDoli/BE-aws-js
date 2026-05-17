type AuthEvent = {
  type: string;
  authorizationToken?: string;
  methodArn: string;
};

type PolicyEffect = "Allow" | "Deny";

type AuthResponse = {
  principalId: string;
  policyDocument: {
    Version: "2012-10-17";
    Statement: Array<{
      Action: "execute-api:Invoke";
      Effect: PolicyEffect;
      Resource: string;
    }>;
  };
};

const buildPolicy = (
  principalId: string,
  effect: PolicyEffect,
  resource: string,
): AuthResponse => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});

export const handler = async (event: AuthEvent): Promise<AuthResponse> => {
  const token = event.authorizationToken;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const [scheme, encodedCredentials] = token.split(" ");

  if (scheme !== "Basic" || !encodedCredentials) {
    return buildPolicy("unknown", "Deny", event.methodArn);
  }

  const decoded = Buffer.from(encodedCredentials, "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex < 0) {
    return buildPolicy("unknown", "Deny", event.methodArn);
  }

  const login = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (!login || !password) {
    return buildPolicy("unknown", "Deny", event.methodArn);
  }

  const expectedPassword = process.env[login];

  if (expectedPassword && expectedPassword === password) {
    return buildPolicy(login, "Allow", event.methodArn);
  }

  return buildPolicy(login, "Deny", event.methodArn);
};
