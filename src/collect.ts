import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import * as path from "path";
import {
	recordFileDevKey,
	recordFileName,
	recordFileProdKey,
} from "./constant";
import { findHash } from "./utils";

export type RecordMapItemType = Record<
	typeof recordFileDevKey | typeof recordFileProdKey,
	string
>;

export const collect = async (
	base: string,
	devdir: string,
	proddir: string,
	output: string
) => {
	//先获取该目录下所有文件夹
	let root = process.cwd();
	if (base) {
		root = path.resolve(root, base);
	}
	const isExist = fs.existsSync(root);
	if (!isExist) {
		console.log(`${root} doesn't exist`);
		return;
	}

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
			console.log(`${devPath} does not exist`);
		} else {
			const final = findHash(devPath);
			if (final[1] !== 0) {
				tmp[recordFileDevKey] = final[0];
			}
		}
		if (!existProd) {
			console.log(`${prodPath} does not exist`);
		} else {
			const final = findHash(devPath);
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

	console.log(recordMap);
	// 写入文件
	if (output) {
		const outPath = path.resolve(output);
		const exist = fs.existsSync(outPath);
		if (!exist) {
			console.log(`${outPath} doesn't exist`);
			return;
		} else {
			const res = await wirteRecord(outPath, recordMap);
			if (res) {
				console.log(
					`successfully generate ${chalk.green(
						outPath
					)}/${chalk.green(recordFileName)}`
				);
			}
		}
	} else {
		const outPath = process.cwd();
		const res = await wirteRecord(outPath, recordMap);
		if (res) {
			console.log(
				`successfully generate ${chalk.green(outPath)}/${chalk.green(
					recordFileName
				)}`
			);
		}
	}
};

const wirteRecord = async (
	outPath: string,
	recordMap: Record<string, RecordMapItemType>
) => {
	const origin = path.join(outPath, recordFileName);
	const originExist = fs.existsSync(origin);
	if (originExist) {
		const choices = ["y", "n"];
		let sign = "y";
		const result = await inquirer.prompt({
			name: "sign",
			type: "list",
			message: `${origin}  already exists , continue ?`,
			choices,
		});
		sign = result.sign;
		console.log(sign);
		if (sign === "n") {
			return false;
		} else {
			fs.unlinkSync(origin);
		}
	}
	fs.writeFileSync(origin, JSON.stringify(recordMap, null, 2));
	return true;
};
