import { MinecraftDimensionTypes, system, world } from "@minecraft/server";

/**
 * This is to reduce lag when grabbing dimensions keep them set and pre-defined
 */
export const DIMENSIONS = {
  overworld: world.getDimension(MinecraftDimensionTypes.overworld),
  nether: world.getDimension(MinecraftDimensionTypes.nether),
  theEnd: world.getDimension(MinecraftDimensionTypes.theEnd),
  "minecraft:overworld": world.getDimension(MinecraftDimensionTypes.overworld),
  "minecraft:nether": world.getDimension(MinecraftDimensionTypes.nether),
  "minecraft:the_end": world.getDimension(MinecraftDimensionTypes.theEnd),
};

/**
 * Awaits till entities spawn in on world load
 * @returns Promise when they load in
 */
export async function awaitEntitiesLoad(): Promise<void> {
  return new Promise((resolve) => {
    let s = system.runSchedule(async () => {
      try {
        await DIMENSIONS.overworld.runCommandAsync(`testfor @a`);
        system.clearRunSchedule(s);
        resolve();
      } catch (error) {}
    }, 5);
  });
}

/**
 * Splits a string into chunk sizes
 */
export function chunkString(str: string, length: number): string[] {
  return str.match(new RegExp(".{1," + length + "}", "g")) ?? [];
}
