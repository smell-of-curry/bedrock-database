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
 * Splits a string into an array of arrays of strings with a maximum length of 32767 characters per string in the innermost array.
 * @param str The input string to split.
 * @param maxLength Max Length of the 1st array
 * @param subArraysMaxLength Max Length of the strings in the 2d array
 * @returns A two-dimensional array of strings, where each inner array has a maximum length of 2147483647.
 */
export function splitString(
  str: string,
  maxLength: number,
  subArraysMaxLength: number
): string[][] {
  const subStrings: string[] = [];
  for (let i = 0; i < str.length; i += maxLength) {
    subStrings.push(str.slice(i, i + maxLength));
  }

  const subArrays: string[][] = [];
  for (const subString of subStrings) {
    subArrays.push(
      Array.from(
        { length: Math.ceil(subString.length / subArraysMaxLength) },
        (_, i) =>
          subString.slice(i * subArraysMaxLength, (i + 1) * subArraysMaxLength)
      )
    );
  }

  return subArrays;
}

/**
 * Concatenates the strings in a two-dimensional array of strings into a single string.
 * @param strArrays A two-dimensional array of strings to concatenate.
 * @returns A single string containing the concatenated strings.
 */
export function joinStringArrays(strArrays: string[][]): string {
  return strArrays.reduce((acc, cur) => acc + cur.join(""), "");
}
