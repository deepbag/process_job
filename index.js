const { v4: uuidv4 } = require("uuid");
const NodeCache = require("node-cache");
const cache = new NodeCache();

const JobStatus = {
  processing: "processing",
  completed: "completed",
  failed: "failed",
};

const setHeaders = (res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
};

const sentProcessStatus = (req, res, data) => {
  req.on("close", () => {
    console.log(
      `sentProcessStatus client closed connection for job ${data.jobId ?? ""}`
    );
    res.end();
  });
  res.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
};

const sentProcessStatusEnd = (req, res, data) => {
  req.on("close", () => {
    console.log(
      `sentProcessStatusEnd client closed connection for job ${
        data.jobId ?? ""
      }`
    );
    res.end();
  });
  res.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
  res.end();
};

const processJob = async ({
  request,
  response,
  jobData,
  onStarted,
  onProcess,
  onFinished,
  onProcessSuccessError,
}) => {
  try {
    const resReq = Boolean(request && response);
    setHeaders(response);
    const jobId = uuidv4();
    const { files, other } = jobData;

    let data = [];

    if (files?.length > 0) {
      cache.set(jobId, {
        jobId,
        status: JobStatus.processing,
        files: files.map((file) => {
          const fileId = uuidv4();
          return {
            fileId: fileId,
            status: JobStatus.processing,
            startTime: null,
            endTime: null,
            duration: null,
            durationinMin: null,
          };
        }),
        startTime: Date.now(),
        endTime: null,
        duration: null,
        durationinMin: null,
        ...other,
      });
      data = files;
    }
    resReq && sentProcessStatus(request, response, cache.get(jobId));
    onStarted(cache.get(jobId));

    async function processInOrder() {
      for (let index = 0; index < data.length; index++) {
        const job = cache.get(jobId);
        job.files[index].startTime = Date.now();
        try {
          await onProcess({
            data: data[index],
            index,
            job: job,
          });
          const processEndTime = Date.now();
          job.files[index].endTime = processEndTime;
          job.files[index].duration =
            processEndTime - job.files[index].startTime;
          job.files[index].status = JobStatus.completed;
          job.files[index].durationinMin = `${(
            job.files[index].duration / 60000
          ).toFixed(2)} min`;
          cache.del(jobId);
          cache.set(jobId, job);
          resReq && sentProcessStatus(request, response, job);
          onProcessSuccessError(job, null);
        } catch (error) {
          const processEndTime = Date.now();
          job.files[index].endTime = processEndTime;
          job.files[index].duration =
            processEndTime - job.files[index].startTime;
          job.files[index].status = JobStatus.failed;
          job.files[index].durationinMin = `${(
            job.files[index].duration / 60000
          ).toFixed(2)} min`;
          cache.del(jobId);
          cache.set(jobId, job);
          resReq && sentProcessStatus(request, response, job);
          onProcessSuccessError(null, error);
        }
      }
    }

    processInOrder()
      .then(async () => {
        const job = cache.get(jobId);
        job.endTime = Date.now();
        job.duration = job.endTime - job.startTime;
        job.status = JobStatus.completed;
        job.durationinMin = `${(job.duration / 60000).toFixed(2)} min`;

        resReq && sentProcessStatusEnd(request, response, job);
        onFinished({ job, jobId }, null);
        cache.del(jobId);
      })
      .catch(async (error) => {
        const job = cache.get(jobId);
        job.endTime = Date.now();
        job.duration = job.endTime - job.startTime;
        job.status = JobStatus.failed;
        job.durationinMin = `${(job.duration / 60000).toFixed(2)} min`;

        resReq && sentProcessStatusEnd(request, response, job);
        onFinished(null, { error, jobId });
        cache.del(jobId);
      });
  } catch (error) {
    return;
  }
};

const getProcessJobId = ({ request, response, jobid }) => {
  try {
    const resReq = Boolean(request && response);
    let job = cache.get(jobid);
    if (!resReq) return job;
    setHeaders(response);

    if (job) {
      sentProcessStatus(request, response, job);
      const intervalId = setInterval(() => {
        job = cache.get(jobid);
        sentProcessStatus(request, response, job);
        if (!job) {
          clearInterval(intervalId);
          sentProcessStatusEnd(request, response, {});
        }
      }, 10000);

      request.on("close", () => {
        clearInterval(intervalId);
      });
    } else {
      sentProcessStatusEnd(request, response, job);
    }
  } catch (error) {
    sentProcessStatusEnd(request, response, error);
  }
};

module.exports = {
  JobStatus,
  processJob,
  setHeaders,
  sentProcessStatus,
  sentProcessStatusEnd,
  processJob,
  getProcessJobId,
};
