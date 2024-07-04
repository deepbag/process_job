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


## Dependencies

- [uuid](https://www.npmjs.com/package/uuid): for random id generation
- [node-cache](https://www.npmjs.com/package/node-cache): Simple and fast NodeJS internal caching

## Contributers

We welcome contributions from the community! If you find a bug, have a feature request, or would like to contribute code, please open an issue or pull request on our GitHub repository. [![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/deepbag/process_job)
<!-- https://contrib.rocks/preview?repo=angular%2Fangular-ja -->

<a href="https://github.com/deepbag/chartam.io/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=deepbag/chartam.io" />
</a>
