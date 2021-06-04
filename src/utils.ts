import spawn from "cross-spawn";
import * as fs from "fs-extra";
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
		child.on("close", resolve); // 安装成功后触发resolve
	});
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
