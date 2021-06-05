import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import * as path from "path";
import { DevProdKey, recordFileName } from "./constant";
import { getHashMap } from "./utils";

export type RecordMapItemType = Record<DevProdKey, string>;

export const collect = async (
	base: string,
	devdir: string,
	proddir: string,
	output: string,
	ignore: string
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

	// 遍历所有文件夹，获取查到对应目录的dev/pkgname/
	const recordMap = getHashMap(root, devdir, proddir);

	// 写入文件
	if (output) {
		const outPath = path.resolve(output);
		const exist = fs.existsSync(outPath);
		if (!exist) {
			console.log(`${outPath} doesn't exist`);
			return;
		} else {
			const res = await wirteRecord(outPath, recordMap, ignore);
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
		const res = await wirteRecord(outPath, recordMap, ignore);
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
	recordMap: Record<string, RecordMapItemType>,
	ignore: string
) => {
	const origin = path.join(outPath, recordFileName);
	const originExist = fs.existsSync(origin);
	if (originExist) {
		if (!ignore) {
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
		} else {
			fs.unlinkSync(origin);
		}
	}
	fs.writeFileSync(origin, JSON.stringify(recordMap, null, 2));
	return true;
};
