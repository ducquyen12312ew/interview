import OpenAI from "openai";
import { IncomingForm } from "formidable";
const fs = require("fs");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  const openai = new OpenAI({
    apiKey: process.env.SHOPAIKEY_API_KEY,
    baseURL: process.env.SHOPAIKEY_OPENAI_BASE_URL,
  });

  const fData = await new Promise<{ fields: any; files: any }>(
    (resolve, reject) => {
      const form = new IncomingForm({
        multiples: false,
        uploadDir: "/tmp",
        keepExtensions: true,
      });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    }
  );

  const videoFile = fData.files.file;
  const videoFilePath = videoFile?.filepath;

  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(videoFilePath),
      model: "whisper-1",
    });

    const transcript = resp?.text;

    const moderationResp = await openai.moderations.create({
      input: transcript,
    });

    if (moderationResp?.results[0]?.flagged) {
      res
        .status(200)
        .json({ error: "Inappropriate content detected. Please try again." });
      return;
    }

    res.status(200).json({ transcript });
    return resp;
  } catch (error) {
    console.error("server error", error);
    res.status(500).json({ error: "Error" });
  }
}
