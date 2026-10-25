export {
  AttributeCreateSchema,
  AttributeUpdateSchema,
  DEFAULT_RATING_ATTRIBUTE_LABELS,
  type AttributeCreateInput,
  type AttributeUpdateInput,
} from "./schemas";
export type { RatingAttribute } from "./types";
export {
  createAttribute,
  deleteAttribute,
  listAttributesForBusiness,
  updateAttribute,
} from "./service";
