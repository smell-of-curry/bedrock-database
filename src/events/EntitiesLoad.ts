import { system, world } from "@minecraft/server";
import { DIMENSIONS } from "../utils";

/**
 * Callbacks that are called when the entities are loaded
 */
const CALLBACKS: {
  [key: number]: () => void;
} = {};

/**
 * If the world is loaded or not
 */
export let ENTITIES_LOADED = false;

/**
 * Sets the world as loaded in, meaning entities are now able to be grabbed
 */
function setEntitiesLoaded() {
  ENTITIES_LOADED = true;
  for (const [i, callback] of Object.entries(CALLBACKS)) {
    callback();
    delete CALLBACKS[i as unknown as number];
  }
}

system.run(async () => {
  try {
    await DIMENSIONS.overworld.runCommandAsync(`testfor @a`);
    setEntitiesLoaded();
  } catch (error) {
    let e = world.events.playerSpawn.subscribe(() => {
      setEntitiesLoaded();
      world.events.playerSpawn.unsubscribe(e);
    });
  }
});

/**
 * Class that exposes methods to subscribe to or wait for entities to be loaded.
 */
export class EntitiesLoad {
  /**
   * Returns a Promise that resolves when the entities are loaded.
   * @returns {Promise<void>} A Promise that resolves when the entities are loaded.
   */
  static async awaitLoad(): Promise<void> {
    if (ENTITIES_LOADED) return;
    return new Promise((resolve) => {
      EntitiesLoad.subscribe(resolve);
    });
  }
  /**
   * Subscribe a callback to be called when the entities are loaded.
   * @param {() => void} callback The function to be called when the entities are loaded.
   * @returns {number} The key associated with this subscription.
   */
  static subscribe(callback: () => void): number {
    const key = Object.keys(CALLBACKS).length;
    if (ENTITIES_LOADED) {
      callback();
      return key;
    }
    CALLBACKS[key] = callback;
    return key;
  }

  /**
   * Unsubscribe a callback from being called when the entities are loaded.
   * @param {number} key The key associated with the subscription to be unsubscribed.
   */
  static unsubscribe(key: number): void {
    delete CALLBACKS[key];
  }
}
