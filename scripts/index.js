// src/index.ts
import {
  DynamicPropertiesDefinition,
  EntityTypes,
  world as world2
} from "@minecraft/server";

// src/config/database.ts
import { BlockLocation } from "@minecraft/server";
var ENTITY_IDENTIFIER = "database:database";
var ENTITY_LOCATION = new BlockLocation(0, -64, 0);

// src/utils.ts
import { MinecraftDimensionTypes, system, world } from "@minecraft/server";
var DIMENSIONS = {
  overworld: world.getDimension(MinecraftDimensionTypes.overworld),
  nether: world.getDimension(MinecraftDimensionTypes.nether),
  theEnd: world.getDimension(MinecraftDimensionTypes.theEnd),
  "minecraft:overworld": world.getDimension(MinecraftDimensionTypes.overworld),
  "minecraft:nether": world.getDimension(MinecraftDimensionTypes.nether),
  "minecraft:the_end": world.getDimension(MinecraftDimensionTypes.theEnd)
};

// src/index.ts
world2.events.worldInitialize.subscribe(({ propertyRegistry }) => {
  DIMENSIONS.overworld.runCommandAsync(
    `tickingarea add ${ENTITY_LOCATION.x} ${ENTITY_LOCATION.y} ${ENTITY_LOCATION.z} ${ENTITY_LOCATION.x} ${ENTITY_LOCATION.y} ${ENTITY_LOCATION.z} db true`
  );
  let def = new DynamicPropertiesDefinition();
  def.defineString("tableName", 30);
  def.defineNumber("index");
  propertyRegistry.registerEntityTypeDynamicProperties(
    def,
    EntityTypes.get(ENTITY_IDENTIFIER)
  );
});
//# sourceMappingURL=index.js.map
