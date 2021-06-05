import spawn from "cross-spawn";
import * as fs from "fs-extra";
import * as path from "path";
import { RecordMapItemType } from "./collect";
import { recordFileDevKey, recordFileProdKey } from "./constant";
/**
 * 使用npm安装或卸载项目依赖
 * @param {*} root 项目路径
 * @param {*} allDependencies 项目依赖
 * @param {*} action npm install 或 npm uninstall
 */
export async function doAction(
	root: string,
	allDependencies: string | string[],
	action = "install"
) {
	typeof allDependencies === "string"
		? (allDependencies = [allDependencies])
		: null;
	return new Promise((resolve) => {
		const command = "npm";
		const args = [
			action,
			"--save",
			"--save-exact",
			"--loglevel",
			"error",
			...allDependencies,
			"--cwd",
			root,
		];
		const child = spawn(command, args, { stdio: "inherit" });
		child.on("close", resolve);
	});
}

export async function buildAction(root: string, script: string) {
	return new Promise((resolve) => {
		const command = "npm run ";
		const args = [script, "--loglevel", "error"];
		const child = spawn(command, args, { stdio: "inherit", cwd: root });
		child.on("close", resolve);
	});
}

export async function copyFolder(workPath: string, targetPath: string) {
	return fs.copy(workPath, targetPath);
}

/**
 * 删除文件、文件夹
 * @param {*} path 要删除资源的路径
 */
export function deleteFolder(path: string) {
	let files = [];
	if (fs.existsSync(path)) {
		if (!fs.statSync(path).isDirectory()) {
			fs.unlinkSync(path);
		} else {
			files = fs.readdirSync(path);
			files.forEach(function (file) {
				let curPath = path + "/" + file;
				deleteFolder(curPath);
			});
			fs.rmdirSync(path);
		}
	}
}

export function findHash(path: string) {
	//查找app.hash.js // 如果没有此文件，则随便找个js，如果还没有，则不记录。
	const innerFiles = fs.readdirSync(path);
	const regExp = /^(?:.+?\.)(.+?)(?:\.js$)/;
	const hashmap: Record<string, number> = {};
	innerFiles.forEach((file) => {
		if (file.includes("js")) {
			// 优先看app
			const res = regExp.exec(file);
			if (res && res.length > 1) {
				const hash = res[1];
				if (hashmap[hash]) {
					hashmap[hash] = hashmap[hash] + 1;
				} else {
					hashmap[hash] = 1;
				}
			}
		}
	});
	//hashmap中最多的值
	const final = Object.entries(hashmap).reduce(
		(prev, next) => {
			if (prev[1] <= next[1]) {
				prev = next;
			}
			return prev;
		},
		["", 0]
	);
	return final;
}

export function getHashMap(root: string, devdir: string, proddir: string) {
	const dirs = fs.readdirSync(root);
	// 遍历所有文件夹，获取查到对应目录的dev/pkgname/
	const recordMap: Record<string, RecordMapItemType> = {};
	dirs.forEach((name) => {
		//查找特定文件夹
		const devPath = path.resolve(root, name, devdir, name);
		const prodPath = path.resolve(root, name, proddir, name);

		const existDev = fs.existsSync(devPath);
		const existProd = fs.existsSync(prodPath);

		const tmp: RecordMapItemType = {
			[recordFileDevKey]: "",
			[recordFileProdKey]: "",
		};
		if (!existDev) {
			//console.log(`${devPath} does not exist`);
		} else {
			const final = findHash(devPath);
			if (final[1] !== 0) {
				tmp[recordFileDevKey] = final[0];
			}
		}
		if (!existProd) {
			//console.log(`${prodPath} does not exist`);
		} else {
			const final = findHash(prodPath);
			if (final[1] !== 0) {
				tmp[recordFileProdKey] = final[0];
			}
		}
		if (tmp[recordFileDevKey] === "" && tmp[recordFileProdKey] === "") {
			//ignore
		} else {
			recordMap[name] = tmp;
		}
	});
	return recordMap;
}
