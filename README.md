# create-activity-script

## 制作初衷

-   由于经常制作单页活动页，在活动越来越多后导致不好管理以及打包缓慢等缺点，所以使用该脚手架制作打包缓存，进行更新。

## 使用说明

安装：

```
npm i create-activity-script -g
```

```
Commands:
  create|c [options] <project-name>  create project
  collect|co [options]               collect all project and generate diff file
  build|b [options]                  diff file and build copy to dist
  help [command]                     display help for command
```

### create

-   用来创建个项目，可以通过-b 指定位置，比如执行命令的目录下的 package 文件夹里创建，则-b package 即可。
-   也可以自己创建，但是需要修改 scripts,publicPath,outputPath

```
create project

Options:
  -b, --base <base>  base dir such as package
  -h, --help         display help for command
```

### collect

-   用来记录文件 hash 值，当包有改动时，hash 值会完全变化，否则 hash 值不变，直接使用缓存不进行打包。
-   该操作默认会记录 hash 值到执行命令的目录下，可以通过-o 进行修改输出位置，-d 与-p 为检测的开发模式或者生产模式的输出文件夹。

```
collect all project and generate diff file

Options:
  -b, --base <base>  base dir such as package
  -d, --dev <dev>    collect dev dir name (default: "develop")
  -p, --prod <prod>  collect dev dir name (default: "prod")
  -o, --out <out>    output diff file
  -h, --help         display help for command
```

### build

-   用来生成最终打包的文件。会先进行对比配置文件的 hash 值，如果不一样，则会对该包进行打包，之后用生成的文件复制进最终的目录。
-   可以通过-m 来表示是开发模式还是生产模式。
-   默认最后生成的目录是 dist。

```
diff file and build copy to dist

Options:
  -b, --base <base>  base dir such as package
  -d, --dev <dev>    collect dev dir name (default: "develop")
  -p, --prod <prod>  collect dev dir name (default: "prod")
  -o, --out <out>    output diff file
  -m, --mode <mode>  dev or prod (default: "dev")
  -h, --help
```

### use with lerna

-   结合 lerna 使用
-   使用 lerna 初始化项目：

```
lerna init
```

-   创建项目

```
create-activity-script create -b packages packagea
create-activity-script create -b packages packageb
create-activity-script create -b packages packagec
create-activity-script create -b packages packaged
create-activity-script create -b packages packagee
```

-   依赖共享

```
lerna link convert
```

-   安装依赖

```
lerna bootstrap
```

-   生成 develop 产物

```
create-activity-script build  -b packages
```

-   生成 prodution 产物

```
create-activity-script build  -b packages -m  prod
```

### changelog

-   1.0.5 支持 lerna
-   1.0.4 去除 create 中自动安装依赖
-   1.0.3 去除模板中复制 gitignore
-   1.0.2 build 与 collect 增加-i 可以一键忽略选择，全部继续 , 修复环境打包记录的 bug。
