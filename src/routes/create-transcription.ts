import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

import { createReadStream } from "node:fs";

import { z } from "zod";
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (req, res) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
    });

    const bodySchema = z.object({
      prompt: z.string(),
    });

    const { videoId } = paramsSchema.parse(req.params);

    const { prompt } = bodySchema.parse(req.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    const videoPath = video.path;

    const audioReadStream = createReadStream(videoPath);

    const result = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      temperature: 0,
      prompt,
    });

    const transcription = result.text;

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription,
      },
    });

    return { transcription };
  });
}
