import path from "path";
import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { tmpdir } from "os";

export default async function handler(req, res) {
 
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Only GET requests are allowed" });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: "No URL provided" });
    }

    try {
        const inputPath = path.join(tmpdir(), "input.m4a");
        const outputPath = path.join(tmpdir(), "output.mp3");

        // Download the M4A file
        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
        });

        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Set FFmpeg binary path
        ffmpeg.setFfmpegPath(ffmpegStatic);

        // Convert M4A to MP3
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .output(outputPath)
                .audioCodec("libmp3lame")
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

        // Send the converted file
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", 'attachment; filename="converted.mp3"');

        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);

        fileStream.on("close", () => {
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
