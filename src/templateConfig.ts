export const vueTemplateConfig = {
	scripts: {
		start: "vue-cli-service serve",
		serve: "vue-cli-service serve",
		"build-dev": "vue-cli-service build --mode development",
		build: "vue-cli-service build",
	},
	eslintConfig: {
		root: true,
		env: {
			node: true,
		},
		extends: ["plugin:vue/essential", "eslint:recommended"],
		parserOptions: {
			parser: "babel-eslint",
		},
		rules: {},
	},
	browserslist: ["> 1%", "last 2 versions", "not dead"],
};

export const reactTemplateConfig = {};
