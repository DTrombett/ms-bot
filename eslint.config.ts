import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
	tseslint.configs.recommendedTypeChecked,
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { parserOptions: { projectService: true } },
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"constructor-super": "off",
			"getter-return": "off",
			"no-class-assign": "off",
			"no-const-assign": "off",
			"no-dupe-args": "off",
			"no-dupe-class-members": "off",
			"no-dupe-keys": "off",
			"no-empty-pattern": "off",
			"no-func-assign": "off",
			"no-import-assign": "off",
			"no-invalid-this": "off",
			"no-new-native-nonconstructor": "off",
			"no-new-symbol": "off",
			"no-obj-calls": "off",
			"no-redeclare": "off",
			"no-setter-return": "off",
			"no-this-before-super": "off",
			"no-undef": "off",
			"no-unreachable": "off",
			"no-unsafe-negation": "off",
			"no-unused-vars": "off",
		},
	},
]);
