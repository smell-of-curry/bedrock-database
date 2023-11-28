import { world } from "@minecraft/server";

export class Database<T extends any> {
  /**
   * Data saved in memory
   */
  private MEMORY: { [key: string]: T } | null;

  /**
   * List of queued tasks on this table
   */
  private QUEUE: Array<() => void>;

  /**
   * Callbacks to run once the database data has been fetched
   */
  private onLoadCallback: (data: { [key: string]: T } | null) => void;

  /**
   * Creates a new instance of the Database
   * @param tableName - The name of the table
   */
  constructor(public tableName: string) {
    this.tableName = tableName;
    this.MEMORY = null;
    this.QUEUE = [];

    const LOADED_DATA = this.fetch();
    this.MEMORY = LOADED_DATA;

    this.onLoadCallback?.(LOADED_DATA);
    this.QUEUE.forEach((v) => v());
  }

  /**
   * Resets this databases key length
   * and resets all corresponding ids.
   */
  private resetStorage() {
    const ids = world
      .getDynamicPropertyIds()
      .filter((i) => i.startsWith(`db_${this.tableName}`));
    for (const id of ids) {
      world.setDynamicProperty(id, undefined);
    }
    world.setDynamicProperty(`db_${this.tableName}`, 0); // Reset key length
  }

  /**
   * Fetches this data from the dynamic properties
   * associated with this database
   * @returns
   */
  private fetch(): { [key: string]: T } {
    let idLength = world.getDynamicProperty(`db_${this.tableName}`) ?? 0;
    if (typeof idLength != "number") {
      console.warn(
        `[DATABASE]: DB: ${this.tableName}, has improper setup! Resetting data.`
      );
      idLength = 0;
      this.resetStorage();
    }
    if (idLength <= 0) return {};

    let collectedData = "";
    for (let i = 0; i < idLength; i++) {
      const data = world.getDynamicProperty(`db_${this.tableName}_${i}`);
      if (typeof data != "string") {
        console.warn(
          `[DATABASE]: When fetching: db_${this.tableName}_${i}, improper data was found.`
        );
        this.resetStorage();
        return {};
      }
      collectedData += data;
    }
    return JSON.parse(collectedData);
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
    const chunks = JSON.stringify(this.MEMORY).match(/.{1,8000}/g);
    if (!chunks) return;
    world.setDynamicProperty(`db_${this.tableName}`, chunks.length);
    const entries = chunks.entries();
    for (const [i, chunk] of entries) {
      world.setDynamicProperty(`db_${this.tableName}_${i}`, chunk);
    }
  }

  /**
   * Sends a callback once this database has initiated data
   * @param callback
   */
  async onLoad(callback: (data: { [key: string]: T } | null) => void) {
    if (this.MEMORY) return callback(this.MEMORY);
    this.onLoadCallback = callback;
  }

  /**
   * Sets the specified `key` to the given `value` in the database table.
   * @param key - Key to store the value in.
   * @param value - The value to store for the specified key.
   * @returns A promise that resolves once the value has been saved in the database table.
   */
  async set(key: string, value: T): Promise<void> {
    if (!this.MEMORY) throw new Error("Data tried to be set before load!");
    this.MEMORY[key] = value;
    return this.saveData();
  }

  /**
   * Gets a value from this table
   * @param {Key} key - The key to retrieve the value for.
   * @returns the value associated with the given key in the database table.
   */
  get(key: string): T | null {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `getAsync` instead!");
    return this.MEMORY[key];
  }

  /**
   * Gets a value asynchronously from the database table.
   * @param {Key} key - The key to retrieve the value for.
   * @returns {Promise<T>} A Promise that resolves to the value associated with the given key in the database table.
   */
  async getSync(key: string): Promise<T | null> {
    if (this.MEMORY) return this.get(key);
    await this.addQueueTask();
    if (!this.MEMORY) return null;
    return this.MEMORY[key];
  }

  /**
   * Get all the keys in the table
   * @returns {string[]} the keys on this table
   */
  keys(): string[] {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `keysSync` instead!");
    return Object.keys(this.MEMORY);
  }

  /**
   * Get all the keys in the table async, this should be used on world load
   * @returns {Promise<string[]>} the keys on this table
   */
  async keysSync(): Promise<string[]> {
    if (this.MEMORY) return this.keys();
    await this.addQueueTask();
    if (!this.MEMORY) return [];
    return Object.keys(this.MEMORY);
  }

  /**
   * Get all the values in the table
   * @returns {T[]} values in this table
   */
  values(): T[] {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `valuesSync` instead!");
    return Object.values(this.MEMORY);
  }

  /**
   * Get all the values in the table async, this should be used on world load
   * @returns {Promise<T[]>} the values on this table
   */
  async valuesSync(): Promise<T[]> {
    if (this.MEMORY) return this.values();
    await this.addQueueTask();
    if (!this.MEMORY) return [];
    return Object.values(this.MEMORY);
  }

  /**
   * Check if the key exists in the table
   * @param {string} key the key to test
   * @returns {boolean} if this key exists on this table
   */
  has(key: string): boolean {
    if (!this.MEMORY)
      throw new Error("Data not loaded! Consider using `hasSync` instead!");
    return Boolean(this.MEMORY[key]);
  }

  /**
   * Check if the key exists in the table async
   * @param {string} key the key to test
   * @returns {Promise<boolean>} if this table contains this key.
   */
  async hasSync(key: string): Promise<boolean> {
    if (this.MEMORY) return this.has(key);
    await this.addQueueTask();
    if (!this.MEMORY) return false;
    return Boolean(this.MEMORY[key]);
  }

  /**
   * Gets all the keys and values
   * @returns The collection data.
   */
  collection(): { [key: string]: T } {
    if (!this.MEMORY)
      throw new Error(
        "Data not loaded! Consider using `collectionSync` instead!"
      );
    return this.MEMORY;
  }

  /**
   * Gets all the keys and values async, this should be used for grabbingCollection on world load
   * @returns {Promise<{ [key: string]: T }>} The collection data.
   */
  async collectionSync(): Promise<{ [key: string]: T }> {
    if (this.MEMORY) return this.collection();
    await this.addQueueTask();
    if (!this.MEMORY) return {};
    return this.MEMORY;
  }

  /**
   * Delete a key from this table
   * @param key the key to delete
   * @returns if the deletion was successful
   */
  async delete(key: string): Promise<boolean> {
    if (!this.MEMORY) return false;
    const status = delete this.MEMORY[key];
    await this.saveData();
    return status;
  }

  /**
   * Clear everything in the table
   * @returns once this table has been cleared
   */
  async clear(): Promise<void> {
    this.MEMORY = {};
    return await this.saveData();
  }

  /**
   * Gets a key by value
   * @param value
   * @returns
   */
  getKeyByValue(value: T): string | null {
    for (const key in this.MEMORY) {
      if (this.MEMORY[key] === value) {
        return key;
      }
    }
    return null; // value not found in object
  }
}
