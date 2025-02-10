import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET requests are allowed" });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const ffmpeg = createFFmpeg({ log: true });

    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }

    // Download M4A file
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer", // Get file as buffer
    });

    const inputFile = "input.m4a";
    const outputFile = "output.mp3";

    // Load file into FFmpeg's memory
    ffmpeg.FS("writeFile", inputFile, new Uint8Array(response.data));

    // Convert M4A to MP3
    await ffmpeg.run("-i", inputFile, "-b:a", "192k", outputFile);

    // Get converted file
    const data = ffmpeg.FS("readFile", outputFile);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="converted.mp3"');

    res.end(Buffer.from(data));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
