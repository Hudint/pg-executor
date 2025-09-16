import {parentPort, workerData} from 'worker_threads';
import {Client} from 'pg';
import Utils from "./Utils";

interface WorkerData {
    queries: string[]
    databaseUrl: string
}

const data: WorkerData = workerData;

const client = new Client({
  connectionString: data.databaseUrl
})
const queries = data.queries;

client.connect().then(async () => {
    for(let i = 0; i < queries.length; i++){
        const q = queries[i];
        try{
            await client.query(q)
        } catch (e) {
            console.log(`Error in Query ${q}: ${e}`)
            process.exit(1)
        }
        parentPort?.postMessage(i)
    }
    process.exit(0)
}).catch(e => {
    console.error("Failed to connect to database", e)
    process.exit(1)
})