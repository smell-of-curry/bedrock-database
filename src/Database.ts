import {
  Entity,
  ItemStack,
  MinecraftItemTypes,
  system,
} from "@minecraft/server";
import {
  ENTITY_IDENTIFIER,
  ENTITY_LOCATION,
  INVENTORY_SIZE,
  MAX_DATABASE_STRING_SIZE,
} from "./config/database";
import { awaitEntitiesLoad, DIMENSIONS } from "./utils";
import { chunkString } from "./utils";

export class Database<Key extends string = string, Value = {}> {
  /**
   * Creates a table entity that is used for data storage
   * @param tableName
   * @param index if not specified no index will be set
   * @returns
   */
  static createTableEntity(tableName: string, index?: number): Entity {
    const entity = DIMENSIONS.overworld.spawnEntity(
      ENTITY_IDENTIFIER,
      ENTITY_LOCATION
    );
    entity.setDynamicProperty("tableName", tableName);
    entity.nameTag = `§aDatabase Table: ${tableName}§r`;
    if (index) entity.setDynamicProperty("index", index);
    return entity;
  }

  /**
   * Gets all table Entities associated with this tableName
   * @param tableName
   * @returns
   */
  static getTableEntities(tableName: string): Entity[] {
    return DIMENSIONS.overworld
      .getEntitiesAtBlockLocation(ENTITY_LOCATION)
      .filter(
        (e) =>
          e.typeId == ENTITY_IDENTIFIER &&
          e.getDynamicProperty("tableName") == tableName
      );
  }

  /**
   * Data saved in memory
   */
  private MEMORY: { [key in Key]: Value } | null;

  /**
   * List of queued tasks on this table
   */
  private QUEUE: Array<() => void>;

  constructor(public tableName: string) {
    this.tableName = tableName;
    this.MEMORY = null;
    this.QUEUE = [];
    system.runSchedule(() => {
      if (this.QUEUE.length == 0) return;
      this.QUEUE.shift()(); // removes queue item and runs it
    }, 1);
    awaitEntitiesLoad().then(async () => {
      this.MEMORY = await this.getData();
    });
  }

  /**
   * Adds a queue task to be awaited
   * @returns once its this items time to run in queue
   */
  private async addQueueTask(): Promise<void> {
    return new Promise((resolve) => {
      this.QUEUE.push(() => {
        resolve();
      });
    });
  }

  /**
   * Saves data into this database
   * @param data
   * @returns once data is saved
   */
  private async saveData(data: { [key in Key]: Value }): Promise<void> {
    await this.addQueueTask();
    await awaitEntitiesLoad(); // Await till world is loaded
    this.MEMORY = data; // set memory
    let entities = Database.getTableEntities(this.tableName);
    /**
     * The split chunks of the stringified data, This is done because we can
     * only store {@link MAX_DATABASE_STRING_SIZE} chars in a single nameTag
     */
    let chunks = chunkString(JSON.stringify(data), MAX_DATABASE_STRING_SIZE);
    /**
     * The amount of entities that is needed to store {@link chunks} data
     */
    const entitiesNeeded =
      Math.ceil(chunks.length / INVENTORY_SIZE) - entities.length;
    if (entitiesNeeded > 0) {
      for (let i = 0; i < entitiesNeeded; i++) {
        entities.push(Database.createTableEntity(this.tableName));
      }
    }
    for (const [i, entity] of entities.entries()) {
      const inventory = entity.getComponent("inventory").container;
      for (const [i, chunk] of chunks.entries()) {
        if (!chunk) continue;
        if (i > inventory.size - 1) break; // Exit because it has maxed items
        let item = new ItemStack(MinecraftItemTypes.acaciaBoat);
        item.nameTag = chunk;
        inventory.setItem(i, item);
        chunks[i] = null; // Delete chunk because its been set.
      }
      // Set all unUsed slots to air
      for (let i = chunks.length + 1; i < inventory.size; i++) {
        inventory.setItem(i, new ItemStack(MinecraftItemTypes.stick, 0));
      }
      entity.setDynamicProperty("index", i);
      entities[i] = null; // Set this entity to null because its maxed out!
      // If all chunks have been saved no need to go to next entity
      if (!chunks.find((v) => v)) break;
    }
    // Check for unUsed entities and despawn them
    entities.filter((e) => e).forEach((e) => e.triggerEvent("despawn"));
    return;
  }

  /**
   * Grabs all data from this table
   * @returns
   */
  private async getData(): Promise<{ [key in Key]: Value }> {
    await awaitEntitiesLoad(); // Await till world is loaded
    if (this.MEMORY) return this.MEMORY;
    let entities = Database.getTableEntities(this.tableName).sort(
      (a, b) =>
        (a.getDynamicProperty("index") as number) -
        (b.getDynamicProperty("index") as number)
    );
    let stringifiedData: string = "";
    for (const entity of entities) {
      const inventory = entity.getComponent("inventory").container;
      for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (!item) continue;
        stringifiedData = stringifiedData + item.nameTag;
      }
    }
    return stringifiedData == "" ? {} : JSON.parse(stringifiedData);
  }

  /**
   * Sets a key to a value in this table
   * @param key
   * @param value
   */
  async set(key: Key, value: Value): Promise<void> {
    const data = await this.getData();
    data[key] = value;
    await this.saveData(data);
    return;
  }

  /**
   * Gets a value from this table
   * @param key
   * @returns the keys corresponding key
   */
  get(key: Key): Value {
    if (!this.MEMORY)
      throw new Error(
        "World is not loaded! Consider using `getAsync` instead!"
      );
    return this.MEMORY[key];
  }

  /**
   * Gets a value async from this table, this should be used on calls from like
   * entityCreate, system.runSchedule or things that could be before database entities spawn
   * @param key
   * @returns
   */
  async getSync(key: Key): Promise<Value> {
    const data = await this.getData();
    return data[key];
  }

  /**
   * Get all the keys in the table
   * @returns
   */
  keys(): Key[] {
    if (!this.MEMORY)
      throw new Error(
        "World is not loaded! Consider using `keysSync` instead!"
      );
    return Object.keys(this.MEMORY) as Key[];
  }

  /**
   * Get all the keys in the table async, this should be used on world load
   * @returns
   */
  async keysSync(): Promise<Key[]> {
    const data = await this.getData();
    return Object.keys(data) as Key[];
  }

  /**
   * Get all the values in the table
   * @returns
   */
  values(): Value[] {
    if (!this.MEMORY)
      throw new Error(
        "World is not loaded! Consider using `valuesSync` instead!"
      );
    return Object.values(this.MEMORY) as Value[];
  }

  /**
   * Get all the values in the table async, this should be used on world load
   * @returns
   */
  async valuesSync(): Promise<Value[]> {
    const data = await this.getData();
    return Object.values(data) as Value[];
  }

  /**
   * Check if the key exists in the table
   * @param key the key to test
   * @returns
   */
  has(key: Key): boolean {
    if (!this.MEMORY)
      throw new Error("World is not loaded! Consider using `hasSync` instead!");
    const keys = this.keys();
    return keys.includes(key);
  }

  /**
   * Check if the key exists in the table async, this should be used on worldLoad
   * @param key the key to test
   * @returns
   */
  async hasSync(key: Key): Promise<boolean> {
    const keys = await this.keysSync();
    return keys.includes(key);
  }

  /**
   * Gets all the keys and values
   * @returns
   */
  collection(): { [key in Key]: Value } {
    if (!this.MEMORY)
      throw new Error(
        "World is not loaded! Consider using `collectionSync` instead!"
      );
    return this.MEMORY;
  }

  /**
   * Gets all the keys and values async, this should be used for grabbingCollection on world load
   * @returns
   */
  async collectionSync(): Promise<{ [key in Key]: Value }> {
    return await this.getData();
  }

  /**
   * Delete the key from the table
   * @param key the key to delete
   * @returns
   */
  async delete(key: Key): Promise<boolean> {
    const data = await this.getData();
    const status = delete data[key];
    await this.saveData(data);
    return status;
  }

  /**
   * Clear everything in the table
   */
  async clear(): Promise<void> {
    await this.saveData({} as { [key in Key]: Value });
    return;
  }
}
