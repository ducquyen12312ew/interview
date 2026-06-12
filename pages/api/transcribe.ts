import OpenAI from "openai";
import { IncomingForm } from "formidable";
const fs = require("fs");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  try {
    if (!process.env.SHOPAIKEY_API_KEY) {
      res.status(500).json({ error: "API key chưa được cấu hình trên server." });
      return;
    }

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

    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(videoFilePath),
      model: "whisper-1",
    });

    const transcript = resp?.text;

    res.status(200).json({ transcript });
    return resp;
  } catch (error) {
    console.error("TRANSCRIBE ERROR:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
