import { Entity, ItemStack, MinecraftItemTypes } from "@minecraft/server";
import {
  BACKUP_NAME,
  ENTITY_IDENTIFIER,
  ENTITY_LOCATION,
  INVENTORY_SIZE,
  MAX_DATABASE_STRING_SIZE,
  MAX_LORE_ARRAY_SIZE,
} from "./config/database";
import { DIMENSIONS, splitString } from "./utils";
import { EntitiesLoad } from "./events/EntitiesLoad";

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
   * Despawn's all database entities
   */
  static despawnTableEntities() {
    return DIMENSIONS.overworld
      .getEntitiesAtBlockLocation(ENTITY_LOCATION)
      .map((e) => e.triggerEvent("despawn"));
  }

  /**
   * Data saved in memory
   */
  private MEMORY: { [key in Key]: Value };

  /**
   * List of queued tasks on this table
   */
  private QUEUE: Array<() => void>;

  /**
   * Creates a new instance of the Database
   * @param tableName - The name of the table
   */
  constructor(public tableName: string) {
    this.tableName = tableName;
    this.MEMORY = {} as { [key in Key]: Value };
    this.QUEUE = [];
    EntitiesLoad.subscribe(async () => {
      await this.initData();
      this.QUEUE.forEach((v) => v());
    });
  }

  /**
   * Adds a queue task to be awaited
   * @returns once its this items time to run in queue
   */
  private async addQueueTask(): Promise<void> {
    return new Promise((resolve) => {
      this.QUEUE.push(resolve);
    });
  }

  /**
   * Saves data into this database
   * @returns once data is saved to the database entities
   */
  private async saveData(): Promise<void> {
    if (!this.MEMORY) await this.addQueueTask();
    let entities = Database.getTableEntities(this.tableName);
    let chunks = splitString(
      JSON.stringify(this.MEMORY),
      MAX_DATABASE_STRING_SIZE,
      MAX_LORE_ARRAY_SIZE
    );
    const entitiesNeeded =
      Math.ceil(chunks.length / INVENTORY_SIZE) - entities.length;
    if (entitiesNeeded > 0) {
      for (let i = 0; i < entitiesNeeded; i++) {
        entities.push(Database.createTableEntity(this.tableName));
      }
    }
    let savedChunks = 0;
    let i = 0;
    while (savedChunks < chunks.length) {
      const entity = entities[i];
      if (!entity) continue;
      const inventory = entity.getComponent("inventory").container;
      inventory.clearAll();
      for (let j = 0; j < inventory.size && savedChunks < chunks.length; j++) {
        const chunk = chunks[savedChunks];
        let item = new ItemStack(MinecraftItemTypes.acaciaBoat);
        item.setLore(chunk);
        inventory.setItem(j, item);
        savedChunks++;
      }
      entity.setDynamicProperty("index", i);
      i++;
    }
    entities.slice(i).forEach((e) => e?.triggerEvent("despawn"));
    DIMENSIONS.overworld.runCommandAsync(
      `structure save ${BACKUP_NAME} ${ENTITY_LOCATION.x} ${ENTITY_LOCATION.y} ${ENTITY_LOCATION.z} ${ENTITY_LOCATION.x} ${ENTITY_LOCATION.y} ${ENTITY_LOCATION.z} disk`
    );
  }

  /**
   * Grabs Data and should only be used on worldLoad
   * @returns {Promise<{ [key in Key]: Value }>} The parsed data.
   */
  private async initData(): Promise<{ [key in Key]: Value }> {
    let entities = Database.getTableEntities(this.tableName).sort(
      (a, b) =>
        (a.getDynamicProperty("index") as number) -
        (b.getDynamicProperty("index") as number)
    );
    console.warn(`entities length ${entities.length}`);
    if (entities.length == 0) {
      console.warn(
        `[Database-Warning]: No data found for table ${this.tableName}!`
      );
      console.warn(`[Database-Warning]: Attempting to load backed-up data.`);
      Database.despawnTableEntities(); // Clears all entities so we can load back-up data!
      try {
        await DIMENSIONS.overworld.runCommandAsync(
          `structure load ${BACKUP_NAME} ${ENTITY_LOCATION.x} ${ENTITY_LOCATION.y} ${ENTITY_LOCATION.z}`
        );
        let backedUpEntities = Database.getTableEntities(this.tableName);
        if (backedUpEntities.length == 0) throw new Error("No Entities found");
        console.warn(
          `[Database-Success]: Back-up data successfully loaded for ${this.tableName}!`
        );

        entities = Database.getTableEntities(this.tableName).sort(
          (a, b) =>
            (a.getDynamicProperty("index") as number) -
            (b.getDynamicProperty("index") as number)
        );
      } catch (error) {
        console.warn(
          `[Database-Warning]: Failed to load back-up data for ${this.tableName}!`,
          error
        );
      }
    }
    const stringifiedData: string[] = [];
    for (const entity of entities) {
      const inventory = entity.getComponent("inventory").container;
      for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item) stringifiedData.push(...item.getLore());
      }
    }
    this.MEMORY = JSON.parse(stringifiedData.join("") || "{}");
    return this.MEMORY;
  }

  /**
   * Sets the specified `key` to the given `value` in the database table.
   * @param key - Key to store the value in.
   * @param value - The value to store for the specified key.
   * @returns A promise that resolves once the value has been saved in the database table.
   */
  async set(key: Key, value: Value): Promise<void> {
    this.MEMORY[key] = value;
    return this.saveData();
  }

  /**
   * Gets a value from this table
   * @param {Key} key - The key to retrieve the value for.
   * @returns the value associated with the given key in the database table.
   */
  get(key: Key): Value {
    if (!this.MEMORY)
      throw new Error(
        "Entities not loaded! Consider using `getAsync` instead!"
      );
    return this.MEMORY[key];
  }

  /**
   * Gets a value asynchronously from the database table.
   * @param {Key} key - The key to retrieve the value for.
   * @returns {Promise<Value>} A Promise that resolves to the value associated with the given key in the database table.
   */
  async getSync(key: Key): Promise<Value> {
    if (this.MEMORY) return this.get(key);
    await this.addQueueTask();
    return this.MEMORY[key];
  }

  /**
   * Get all the keys in the table
   * @returns {Key[]} the keys on this table
   */
  keys(): Key[] {
    if (!this.MEMORY)
      throw new Error(
        "Entities not loaded! Consider using `keysSync` instead!"
      );
    return Object.keys(this.MEMORY) as Key[];
  }

  /**
   * Get all the keys in the table async, this should be used on world load
   * @returns {Promise<Key[]>} the keys on this table
   */
  async keysSync(): Promise<Key[]> {
    if (this.MEMORY) return this.keys();
    await this.addQueueTask();
    return Object.keys(this.MEMORY) as Key[];
  }

  /**
   * Get all the values in the table
   * @returns {Value[]} values in this table
   */
  values(): Value[] {
    if (!this.MEMORY)
      throw new Error(
        "Entities not loaded! Consider using `valuesSync` instead!"
      );
    return Object.values(this.MEMORY) as Value[];
  }

  /**
   * Get all the values in the table async, this should be used on world load
   * @returns {Promise<Value[]>} the values on this table
   */
  async valuesSync(): Promise<Value[]> {
    if (this.MEMORY) return this.values();
    await this.addQueueTask();
    return Object.values(this.MEMORY) as Value[];
  }

  /**
   * Check if the key exists in the table
   * @param {Key} key the key to test
   * @returns {boolean} if this key exists on this table
   */
  has(key: Key): boolean {
    if (!this.MEMORY)
      throw new Error("Entities not loaded! Consider using `hasSync` instead!");
    return (Object.keys(this.MEMORY) as Key[]).includes(key);
  }

  /**
   * Check if the key exists in the table async
   * @param {Key} key the key to test
   * @returns {Promise<boolean>} if this table contains this key.
   */
  async hasSync(key: Key): Promise<boolean> {
    if (this.MEMORY) return this.has(key);
    await this.addQueueTask();
    return (Object.keys(this.MEMORY) as Key[]).includes(key);
  }

  /**
   * Gets all the keys and values
   * @returns { [key in Key]: Value } The collection data.
   */
  collection(): { [key in Key]: Value } {
    if (!this.MEMORY)
      throw new Error(
        "Entities not loaded! Consider using `collectionSync` instead!"
      );
    return this.MEMORY;
  }

  /**
   * Gets all the keys and values async, this should be used for grabbingCollection on world load
   * @returns {Promise<{ [key in Key]: Value }>} The collection data.
   */
  async collectionSync(): Promise<{ [key in Key]: Value }> {
    if (this.MEMORY) return this.collection();
    await this.addQueueTask();
    return this.MEMORY;
  }

  /**
   * Delete a key from this table
   * @param key the key to delete
   * @returns if the deletion was successful
   */
  async delete(key: Key): Promise<boolean> {
    const status = delete this.MEMORY[key];
    await this.saveData();
    return status;
  }

  /**
   * Clear everything in the table
   * @returns once this table has been cleared
   */
  async clear(): Promise<void> {
    this.MEMORY = {} as { [key in Key]: Value };
    return await this.saveData();
  }
}
