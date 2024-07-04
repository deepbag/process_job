# process_job - background processing

`process_job` is a Node.js utility that helps manage job processing status using Server-Sent Events (SSE). It provides mechanisms to start, track, and complete jobs, with updates sent to the client in real-time.

## Installation

To install `process_job`, use npm:

```sh
npm install process_job
```
```sh
yarn add process_job
```

## Usage

```sh
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
const { processJob, getProcessJobId } = require("process_job");

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

app.post("/process_xlsx", upload.array("files"), async (request, response) => {
  try {
    processJob({
      request,
      response,
      jobData: {
        files: request.files,
      },
      onStarted: async (job) => {
        console.log("onStarted", job);
      },
      onProcess: async ({ data, job }) => {
        let jobs = JSON.parse(JSON.stringify(job));
        const workbook = XLSX.readFile(data.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log("onProcess", jobs);
        await sleep(15000);
      },
      onFinished: async (data) => {
        console.log("onFinished", data);
      },
      onProcessSuccessError: async (success, error) => {
        console.log("onProcessSuccessError", success, error);
      },
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/process/:jobid", upload.array("files"), async (request, response) => {
  try {
    const { jobid } = request.params;
    console.log(jobid);
    getProcessJobId({ request, response, jobid });
  } catch (error) {
    console.log(error);
  }
});

app.listen(9000, () => {
  console.log(`Server is running on port ${9000}`);
});
```
