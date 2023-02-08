import { BlockLocation } from "@minecraft/server";

/*
|--------------------------------------------------------------------------
| Max Database string size
|--------------------------------------------------------------------------
|
| Here is the max database save size meaning when a save gets made
| it tests the size of that save and splits up the save depending on this
| Size. It's related to Minecraft's 32k bit limit.
|
*/
export const MAX_DATABASE_STRING_SIZE = 32000;

/*
|--------------------------------------------------------------------------
| Max Lore Array Size
|--------------------------------------------------------------------------
|
| Here is the max database lore size meaning when a save gets made
| it tests the size of that lore array is bigger than this then splits up
| the length. It's related to int32 NBT storage of lists.
|
*/
export const MAX_LORE_ARRAY_SIZE = 2000000;

/*
|--------------------------------------------------------------------------
| Entity Id
|--------------------------------------------------------------------------
|
| This is the entity id of the database this is what stores the information
| of the database on its nameTag
|
*/
export const ENTITY_IDENTIFIER = "database:database";

/*
|--------------------------------------------------------------------------
| Entity Spawn Location
|--------------------------------------------------------------------------
|
| This is the spawn location of the database entities there will be
| Multiple entities at this location for each chunk
|
*/
export const ENTITY_LOCATION = new BlockLocation(0, -64, 0);

/*
|--------------------------------------------------------------------------
| Entity's INVENTORY_SIZE
|--------------------------------------------------------------------------
|
| The max amount of items this entity can store in its inventory
|
*/
export const INVENTORY_SIZE = 128;

/*
|--------------------------------------------------------------------------
| Back Up Name
|--------------------------------------------------------------------------
|
| The structure file name for the backed up data in this database
|
*/
export const BACKUP_NAME = "database:entities";
