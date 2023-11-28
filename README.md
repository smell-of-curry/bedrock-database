# Bedrock Database 3.0

A Minecraft Bedrock asynchronous database with unlimited storage. This database works on Dynamic Properties.
The database is designed for optimal performance and has a built in queue system for async calls.

## Getting started:

First you will need to make a table, you can do this by either adding a key to the `TABLES` object in [tables.ts](src/tables.ts) or
creating a variable assigned to a `Database` instance. A Cool thing about this database is that it supports full type safety and
you can predefine the types of the keys and values of the database.

```ts
import { Database } from "./Database.ts";

const table = new Database<any>("test");
```

## Setting Data:

Setting data is very simple and will send back a promise that can be awaited to let you know when the data is successfully saved in the entities.

```ts
table.set("someRandomKey", "someRandomValue");
```

```ts
async function saveSomeData() {
  await table.set("someRandomKey", "someRandomValue");
  console.warn("Data has been set");
}
```

## Grabbing Data:

This database supports Asynchronous calls that can be used for grabbing data at any time (which includes on world load), or you simply
can grab data from memory.

```ts
table.getSync("someRandomKey").then((v) => {
  console.warn(v); // "someRandomValue"
});
```

Or you can simply call from memory using:

> **Warning**: This can throw errors if data is tried to grab before world load.

```ts
const value = table.get("someRandomKey");
```

## Other Supported Methods:

### Keys:

Returns a iterable list of keys that are stored in this table.

> **Warning**: This can throw errors if data is tried to grab before world load.

```ts
table.keys(): any[]
```

```ts
table.keysSync(): Promise<any[]>
```

### Values:

Returns a iterable list of all values that are stored in this table.

> **Warning**: This can throw errors if data is tried to grab before world load.

```ts
table.values(): any[]
```

```ts
table.valuesSync(): Promise<any[]>
```

### Has:

Checks if a key exists on this table and returns boolean.

> **Warning**: This can throw errors if data is tried to grab before world load.

```ts
table.has(key: any): boolean
```

```ts
table.hasSync(key: any): Promise<boolean>
```

### Collection:

Returns a Object of all keys and values on this table.

> **Warning**: This can throw errors if data is tried to grab before world load.

```ts
table.collection(): { [any]: any }
```

```ts
table.collection(): Promise<{ [any]: any }>
```

### Delete:

Deletes a key on this table and returns a boolean if it successfully deleted the key.

```ts
table.delete(key: any): Promise<boolean>
```

### Clear

Clears the entire table and sets it back to a empty object, then returns once finished.

```ts
table.clear(): Promise<void>
```
