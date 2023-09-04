import { Model } from "mongoose";

export const string = { type: String, required: true } as const;
export const number = { type: Number, required: true } as const;
export type Document<T> = T extends Model<any, any, any, any, infer M> ? M : never;
