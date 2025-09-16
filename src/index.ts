import fs = require('fs');
import path = require('path');
import cliProgress = require('cli-progress');
import {Worker} from 'worker_threads';
import Utils from "./Utils";

const uniqueSplitString = "##-#;#-##"

function sqlFileToQueries(fileContent: string) {
    return fileContent
        .replace(/\)\s*;\s*\n/g, ")" + uniqueSplitString)
        .replace(/(\r\n|\n|\r)/gm, " ") // remove newlines
        .replace(/\s+/g, ' ') // excess white space
        .split(uniqueSplitString) // split into all statements
        .map(Function.prototype.call, String.prototype.trim)
        .filter(function (el) {
            return el.length != 0
        }); // remove any empty ones
}


const input_dir = "/input"
if(!fs.existsSync(input_dir)){
    throw new Error(`Input directory ${input_dir} does not exist! Please attach it as volume (-v "./sql-files-input:${input_dir}")`)
}
const files = fs.readdirSync(input_dir)
    .filter(f => /^[0-9]+_.*\.sql$/.test(f))


interface Group {
    n: number,
    files: string[]
}
const grouped: Group[] = []
files.forEach(f => {
    const number = parseInt(f.split('_')[0])
    let index = grouped.findIndex(g => g.n == number)
    const last = index === -1 ? {
        n: number,
        files: []
    } : grouped[index]

    last.files.push(f)
    if (index === -1) {
        grouped.push(last)
    } else {
        grouped[index] = last;
    }
})

grouped.sort((a, b) => {
    const numA = a.n;
    const numB = b.n;
    return numA - numB;
})


// {bar} | {filename} | {value}/{total}
const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: false,
    format: '{bar} | {filename} | {value}/{total}',
}, cliProgress.Presets.shades_grey)

async function run() {
    let i = 0;
    const overviewBar = multibar.create(grouped.length, 0, {filename: "Overall"})
    for (const group of grouped) {
        await processGroup(group)
        overviewBar.update(++i)
    }
    multibar.stop();
}
run().then(r => console.log("All done"));

function processGroup(group: Group) {
    const files = group.files;

    const filesWithChunks = files.map(file => {
        const content = fs.readFileSync(path.join(input_dir, file), {encoding: "utf8"})
        const queries = sqlFileToQueries(content);
        const chunks = toChunks(queries, 5000);
        return [file, queries, chunks]
    })

    const chunkLength = filesWithChunks.reduce((p, [f, q, c]) => p + c.length, 0)

    return new Promise<void>(done => {
        const exited = new Set();

        for (const [file, queries, chunks] of filesWithChunks) {
            const bar = multibar.create(queries.length, 0, {filename: file})
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i]
                const key = `${file}#${i}`;
                const worker = new Worker('./worker.js', {
                    workerData: {
                        queries: chunk,
                        databaseUrl: Utils.getEnv("DB")
                    },
                });

                worker.on("message", () => bar.increment())
                worker.on("exit", code => {
                    if (code != 0) process.exit(code)

                    exited.add(key);
                    if (exited.size === chunkLength) {
                        done()
                    }
                })
            }
        }
    })
}

function toChunks<T>(array: T[], chunkSize: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

