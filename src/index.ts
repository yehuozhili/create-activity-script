import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import modifyTemplate from "./modifyTemplate";
import { reactTemplateConfig, vueTemplateConfig } from "./templateConfig";
import { deleteFolder, doAction } from "./utils";

const packageJson = require("../package.json");
let program = new Command();

init();
async function init() {
	let projectName: string;
	program
		.version(packageJson.version)
		.arguments("<projectName>")
		.usage(`${chalk.green(`<projectName>`)}`)
		.action((name) => {
			projectName = name;
		})
		.parse(process.argv);

	await createApp(projectName!);
}
async function createApp(projectName: string) {
	const root = path.resolve(projectName);
	const isExist = fs.existsSync(root);
	const choices = ["y", "n"];
	let sign = true;
	if (isExist) {
		const result = await inquirer.prompt({
			name: "sign",
			type: "list",
			message: `${projectName} directory already exists , continue ?`,
			choices,
		});
		sign = result.sign;
	}
	if (!sign) {
		return;
	}
	fs.ensureDirSync(projectName); // 没有则创建文件夹
	console.log(`create a new app in ${chalk.green(root)}`);
	const packageJson = {
		name: projectName,
		version: "0.0.1",
		private: true,
	};
	// 写入package.json
	fs.writeFileSync(
		path.join(root, "package.json"),
		JSON.stringify(packageJson, null, 2)
	);
	process.chdir(root);
	// 复制项目模板，安装项目依赖等
	await run(root, projectName);
}

async function run(root: string, projectName: string) {
	const template = "yh-cas-template";
	const templateName = template;
	const allDependencies = [templateName];
	console.log("Installing packages. This might take a couple of minutes");
	console.log(`Installing ${chalk.cyan(templateName)} ...`);
	try {
		await doAction(root, allDependencies);
	} catch (e) {
		console.log(`Installing ${chalk.red(templateName)} failed ...`, e);
	}
	console.log(`Installing ${chalk.cyan(templateName)} succeed!`);

	// 选择模板
	const repos = ["vue"];
	const { targetTemplate } = await inquirer.prompt({
		name: "targetTemplate",
		type: "list",
		message: "which template do you prefer?",
		choices: repos,
	});

	const templatePath = path.dirname(
		require.resolve(`${templateName}/package.json`, { paths: [root] })
	);
	// 复制文件到项目目录

	const gitIgnoreDir = path.join(templatePath, ".npmignore");
	const tempDir = path.join(root, "temp");
	const templateDir = path.join(templatePath, `${targetTemplate}-template`);
	// D:\project\create-activity-script\hello\node_modules\yh-cas-template\.npmignore
	// D:\project\create-activity-script\hello\temp
	// D:\project\create-activity-script\hello\node_modules\yh-cas-template\vue-template

	if (fs.existsSync(templatePath)) {
		await modifyTemplate(templateDir, "temp", {
			projectName: projectName,
			basicProject: targetTemplate,
		});

		fs.copySync(tempDir, root);
		fs.copyFileSync(gitIgnoreDir, root + "/.gitignore");
		deleteFolder(tempDir);
	} else {
		console.error(
			`Could not locate supplied template: ${chalk.green(templatePath)}`
		);
		return;
	}
	// 合并template.json和package.json
	let tempPkg = fs.readFileSync(root + "/template.json").toString();
	let pkg = fs.readFileSync(root + "/package.json").toString();

	const extraConfig =
		targetTemplate === "vue" ? vueTemplateConfig : reactTemplateConfig;

	const tempPkgJson = JSON.parse(tempPkg);
	let pkgJson = JSON.parse(pkg);
	pkgJson = { ...pkgJson, ...extraConfig };
	pkgJson.dependencies = {
		...pkgJson.dependencies,
		...tempPkgJson.package.dependencies,
	};
	pkgJson.devDependencies = {
		...tempPkgJson.package.devDependencies,
	};
	// 编写package.json
	fs.writeFileSync(
		path.join(root, "package.json"),
		JSON.stringify(pkgJson, null, 2)
	);
	fs.unlinkSync(path.join(root, "template.json"));

	// 再次根据dependenciesToInstall执行npm install
	const dependenciesToInstall = Object.entries({
		...pkgJson.dependencies,
		...pkgJson.devDependencies,
	});
	let newDependencies: string[] = [];
	if (dependenciesToInstall.length) {
		newDependencies = newDependencies.concat(
			dependenciesToInstall.map(([dependency, version]) => {
				return `${dependency}@${version}`;
			})
		);
	}
	await doAction(root, newDependencies);
	console.log(`${chalk.cyan("Installing succeed!")}`);
	await doAction(root, template, "uninstall");

	console.log(`🎉  Successfully created project ${projectName}.`);
	console.log("👉  Get started with the following commands:");
	console.log(`${chalk.cyan(`cd ${projectName}`)}`);
	console.log(`${chalk.cyan("$ npm run start")}`);
	process.exit(0);
}
