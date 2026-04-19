import { RequiredPatternSchema } from "./Schemas";
import { z } from "zod";

export const ProductSchema = z.object({
  productId: z.string(),
  /* eslint-disable sort-keys */
  priceId: z.string(),
  price: z.string(),
  /* eslint-enable sort-keys */
});

const PatternSchema = z.object({
  name: z.string(),
  colorPalettes: z
    .array(
      z.object({
        name: z.string(),
      }),
    )
    .optional(),
  pattern: RequiredPatternSchema,
  product: ProductSchema.nullable(),
  role_group: z.string().optional(),
});

export const ColorPaletteSchema = z.object({
  isArchived: z.boolean().optional(),
  name: z.string(),
  primary: z.string().optional(),
  secondary: z.string().optional(),
});

// Schema for resources/cosmetics/cosmetics.json
export const CosmeticsSchema = z.object({
  patterns: z.record(z.string(), PatternSchema),
  colorPalettes: z.record(z.string(), ColorPaletteSchema).optional(),
  role_groups: z.record(z.string(), z.array(z.string())).optional(),
  /* eslint-disable sort-keys */
  flag: z
    .object({
      layers: z.record(
        z.string(),
        z.object({
          name: z.string(),
          flares: z.string().array().optional(),
        }),
      ),
      color: z.record(
        z.string(),
        z.object({
          color: z.string(),
          name: z.string(),
          flares: z.string().array().optional(),
        }),
      ),
    })
    .optional(),
  /* eslint-enable sort-keys */
});
export type Cosmetics = z.infer<typeof CosmeticsSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type Product = z.infer<typeof ProductSchema>;
export const DefaultPattern = {
  name: "default",
  patternData: "",
} as const;
