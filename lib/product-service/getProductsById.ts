import { products } from "./data/products";

type Event = {
  pathParameters?: {
    productId?: string;
  };
};

export const handler = async (
  event: Event,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "productId path parameter is required" }),
    };
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Product with id "${productId}" not found`,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  };
};
