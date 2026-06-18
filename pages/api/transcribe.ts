import OpenAI from "openai";
import { IncomingForm } from "formidable";
import os from "os";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  let uploadedFilePath: string | undefined;

  console.log("[API transcribe] Nhận request");

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
          // Use the OS temp directory so this works on every platform.
          // A hardcoded "/tmp" resolves to a non-existent path on Windows
          // and was the cause of the 500 errors.
          uploadDir: os.tmpdir(),
          keepExtensions: true,
        });
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      }
    );

    // formidable can return either a single file or an array depending on
    // version/config — normalize to a single file object.
    const rawFile = fData.files.file;
    const videoFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    uploadedFilePath = videoFile?.filepath;

    const question = Array.isArray(req.query.question)
      ? req.query.question[0]
      : req.query.question;
    console.log("[API transcribe] Question:", question?.substring(0, 80));
    console.log("[API transcribe] Audio size:", videoFile?.size, "bytes");

    if (!uploadedFilePath) {
      res.status(400).json({ error: "Không tìm thấy tệp âm thanh trong yêu cầu." });
      return;
    }

    console.log("[API transcribe] Gọi OpenAI Whisper...");
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(uploadedFilePath),
      model: "whisper-1",
      language: "vi",
      prompt:
        "Đây là câu trả lời phỏng vấn xin việc bằng tiếng Việt về công nghệ thông tin.",
    });

    console.log("[API transcribe] Whisper trả về:", resp?.text?.substring(0, 100));
    res.status(200).json({ transcript: resp?.text ?? "" });
  } catch (error) {
    console.error("[API transcribe] LỖI:", error);
    console.error("TRANSCRIBE ERROR:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // Clean up the temporary upload — the audio is never persisted.
    if (uploadedFilePath) {
      fs.promises.unlink(uploadedFilePath).catch(() => {});
    }
  }
}
