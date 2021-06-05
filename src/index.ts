import { Command } from "commander";
import { collect } from "./collect";
import { init } from "./create";
const packageJson = require("../package.json");
let program = new Command();

program
	.command("create <project-name>")
	.description("create project")
	.alias("c")
	.option("-b, --base <base>", "base dir such as package")
	.action((name, options) => {
		init(name, options.base);
	});
program
	.command("collect")
	.description("collect all project and generate diff file")
	.alias("co")
	.option("-b, --base <base>", "base dir such as package")
	.option("-d, --dev <dev>", "collect dev dir name", "develop")
	.option("-p, --prod <prod>", "collect dev dir name", "prod")
	.option("-o, --out <out>", "output diff file")
	.action((options) => {
		collect(options.base, options.dev, options.prod, options.out);
	});

program.version(packageJson.version).parse(process.argv);
