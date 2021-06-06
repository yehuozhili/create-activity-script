import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import * as path from "path";
import { RecordMapItemType } from "./collect";
import { DevProdKey, recordFileName, scriptDev, scriptProd } from "./constant";
import { buildAction, copyFolder, deleteFolder, getHashMap } from "./utils";

export const build = async (
	base: string,
	devdir: string,
	proddir: string,
	output: string,
	mode: DevProdKey,
	ignore: string
) => {
	console.time();
	// 检测是否存在配置文件，不存在配置文件则询问是否全部打包
	// 配置文件应该在output同级
	let root = process.cwd();
	if (base) {
		root = path.resolve(root, base);
	}
	const isExist = fs.existsSync(root);
	if (!isExist) {
		console.log(`${root} doesn't exist`);
		return;
	}

	const outPath = output
		? path.resolve(process.cwd(), output)
		: path.resolve(process.cwd());

	const outIsExit = fs.existsSync(outPath);
	if (!outIsExit) {
		console.log(`${outPath} doesn't exist`);
		return;
	}

	//查找配置文件
	const jsonFile = path.resolve(outPath, recordFileName);
	const jsonFileIsExist = fs.existsSync(jsonFile);
	let json = {};
	if (!jsonFileIsExist) {
		if (!ignore) {
			const choices = ["y", "n"];
			let sign = "y";
			const result = await inquirer.prompt({
				name: "sign",
				type: "list",
				message: `${jsonFile} doesn't  exists , continue ? will build all packages.`,
				choices,
			});
			sign = result.sign;
			if (sign === "n") {
				return;
			}
		}
	} else {
		// 读取文件后放json
		const file = fs.readFileSync(jsonFile).toString();
		try {
			json = JSON.parse(file);
		} catch (e) {
			console.log(e);
			return;
		}
	}
	const nowJson = getHashMap(root, devdir, proddir);
	// 进行对比
	const res = diff(json, nowJson, mode);
	// 对比结果先查找可以复制的是否存在路径，然后查找可以build&copy的包,列举处理意见
	const solution = check(res, root, mode, devdir, proddir);

	// 根据solution 提示
	console.log(
		`${chalk.blue("The following packages will copy to the output:")}`
	);
	console.log(`${chalk.green(solution[0])}`);
	console.log(
		`${chalk.blue("The following packages will build and copy to output:")}`
	);
	console.log(`${chalk.green(solution[1])}`);
	// 对比结果询问是否继续build
	if (!ignore) {
		const choices = ["y", "n"];
		let sign = "y";
		const result = await inquirer.prompt({
			name: "sign",
			type: "list",
			message: `continue?`,
			choices,
		});
		sign = result.sign;
		if (sign === "n") {
			return;
		}
	}
	// 先进行build，build完毕查找是否存在所需的目录，成功build则返回true否则false
	const buildResult = await buildFile(solution, root, mode);
	if (buildResult) {
		console.log(`${chalk.green("build successfully")}`);
		// 将数组合并，获取可以复制的文件数组，进行复制
		const willCopy = [...solution[0], ...solution[1]];
		const copyResult = await copyFileToOutput(
			willCopy,
			root,
			mode,
			devdir,
			proddir,
			outPath
		);
		if (copyResult) {
			console.log(`${chalk.green("copy successfully")}`);
			// 更新配置文件到最新
			if (jsonFileIsExist) {
				fs.unlinkSync(jsonFile);
			}
			// 收集新map
			const nowJson = getHashMap(root, devdir, proddir);
			// 这里需要保留上次的另一个key,否则有bug
			const resJson = genNewJson(mode, json, nowJson);

			fs.writeFileSync(jsonFile, JSON.stringify(resJson, null, 2));
			console.log(
				`${chalk.green("update " + recordFileName + " successfully")}`
			);
		}
	} else {
		console.log(
			`${chalk.red(
				"please check your package script can work correctly"
			)}`
		);
	}
	console.timeEnd();
};

const genNewJson = (
	mode: DevProdKey,
	json: Record<string, RecordMapItemType>,
	nowJson: Record<string, RecordMapItemType>
) => {
	const newJSON: Record<string, RecordMapItemType> = {};
	const originKey = Object.keys(json);
	if (mode === "dev") {
		originKey.forEach((v) => {
			newJSON[v] = {
				dev: nowJson[v].dev,
				prod: json[v].prod,
			};
		});
	} else {
		originKey.forEach((v) => {
			newJSON[v] = {
				dev: json[v].dev,
				prod: nowJson[v].prod,
			};
		});
	}
	//json里没有的
	const rest = Object.keys(nowJson).filter((v) => !originKey.includes(v));
	rest.forEach((v) => {
		newJSON[v] = nowJson[v];
	});
	return newJSON;
};

const copyFileToOutput = async (
	willCopy: string[],
	root: string,
	mode: DevProdKey,
	devdir: string,
	proddir: string,
	outPath: string
) => {
	// 建立dist 文件夹
	const distPath = path.resolve(outPath, "dist");
	// 这里不询问，没有就创建，有就直接复制，或者执行该脚本前用rimRaf删除dist
	fs.ensureDirSync(distPath);
	const modeDir = mode === "dev" ? devdir : proddir;
	const promises: Promise<any>[] = [];
	willCopy.forEach((v) => {
		const workPath = path.resolve(root, v, modeDir, v);
		const isExist = fs.existsSync(workPath);
		if (!isExist) {
			console.log(`${chalk.red(workPath + "does not exist")}`);
		} else {
			//查看dist下是否存在，如果存在需要删掉，以免越来越大
			const targetPath = path.resolve(distPath, v);
			const isExist = fs.existsSync(targetPath);
			if (isExist) {
				deleteFolder(targetPath);
			}
			promises.push(copyFolder(workPath, targetPath));
		}
	});
	try {
		await Promise.all(promises);
		return true;
	} catch (e) {
		console.log(e);
		return false;
	}
};

const buildFile = async (
	solution: string[][],
	root: string,
	mode: DevProdKey
) => {
	// 先切进目录进行build
	const willbuild = solution[1];
	const r = root;
	const cwd = process.cwd();
	const lernaJson = path.resolve(cwd, "lerna.json");
	const isLerna = fs.existsSync(lernaJson);
	if (isLerna) {
		console.log(
			`${chalk.red(
				"detect lerna.json , will use lerna exec replace npm build"
			)}`
		);
	}

	const promises: Promise<any>[] = [];
	willbuild.forEach((v) => {
		const workPath = path.resolve(r, v);
		const script = mode === "dev" ? scriptDev : scriptProd;
		promises.push(buildAction(workPath, script, cwd, isLerna, v));
	});
	try {
		await Promise.all(promises);
		return true;
	} catch (e) {
		console.log(e);
		return false;
	}
};

const check = (
	res: string[],
	root: string,
	mode: DevProdKey,
	devdir: string,
	proddir: string
) => {
	//先查找是否存在要复制的路径
	const filterRes = res.filter((pkgName) => {
		const modePath = mode === "dev" ? devdir : proddir;
		const copyPath = path.resolve(root, pkgName, modePath, pkgName);
		const isExist = fs.existsSync(copyPath);
		if (!isExist) {
			return false;
		}
		return true;
	});

	// 查找可以build的包
	const dirs = fs.readdirSync(root);
	const filterDirs = dirs.filter((v) => !filterRes.includes(v));
	// 是否可以build查看该目录下package.json存在，并且里面scripts存在build-dev与build
	// "scripts": {
	// 	"build-dev": "vue-cli-service build --mode development",
	// 	"build": "vue-cli-service build"
	// },
	const script = mode === "dev" ? scriptDev : scriptProd;
	const canBuild = filterDirs.filter((v) => {
		const packagejson = path.resolve(root, v, "package.json");
		const isExist = fs.existsSync(packagejson);
		if (!isExist) {
			return false;
		} else {
			const jsons = fs.readFileSync(packagejson).toString();
			try {
				const json = JSON.parse(jsons);
				if (json["scripts"][script]) {
					return true;
				} else {
					return false;
				}
			} catch {
				return false;
			}
		}
	});

	return [filterRes, canBuild];
};

const diff = (
	oldJson: Record<string, RecordMapItemType>,
	newJson: Record<string, RecordMapItemType>,
	mode: DevProdKey
) => {
	//以旧为基准，进行更新，返回可以复制的文件夹名，
	return Object.keys(oldJson).reduce<string[]>((prev, next) => {
		//查看newJson上有没有这个值
		const pkg = newJson[next];
		if (pkg) {
			const hash = pkg[mode];
			if (oldJson[next][mode] && hash === oldJson[next][mode]) {
				prev.push(next);
			}
		}
		return prev;
	}, []);
};
