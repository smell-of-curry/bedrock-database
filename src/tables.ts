import { Database } from "./Database";

/**
 * All the Database tables that are created
 */
export const TABLES = {
  test: new Database<any>("test"),
  example: new Database<any>("example"),
};
