import type { Schema } from "mongoose";
import { deleteModel, model, modelNames } from "mongoose";

export const createModel = <T extends Schema>(name: string, schema: T) => {
	if (modelNames().includes(name)) deleteModel(name);
	return model<T>(name, schema);
};
