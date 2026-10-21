import { config } from "../../config";
import { getIPAddress } from "./ip";

export const LIMIT = 10;
export const RADIUS = 4960;

// export const allowUrls = [
//   `http://localhost`,
//   `http://localhost`,
//   `http://localhost:5173`,
//   'http://localhost:3000',
//   'http://localhost:3000',
//   `http://${getIPAddress()}:5173`,
//   `http://${getIPAddress()}:${config.env.PORT}`,
//   `http://${getIPAddress()}:${config.env.PORT}`,
//   config.env.CLIENT_URL
// ];
export const allowUrls = [
  `https://localhost`,
  `https://localhost`,
  `https://localhost:5173`,
  'https://localhost:3000',
  'https://localhost:3000',
  `https://${getIPAddress()}:5173`,
  `https://${getIPAddress()}:${config.env.PORT}`,
  `https://${getIPAddress()}:${config.env.PORT}`,
  config.env.CLIENT_URL
];
