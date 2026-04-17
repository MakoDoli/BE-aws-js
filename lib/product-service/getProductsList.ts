import { products } from './data/products';

export const handler = async (): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(products),
  };
};
