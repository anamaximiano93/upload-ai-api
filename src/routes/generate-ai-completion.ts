import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

import { streamToResponse, OpenAIStream } from "ai";

// import { createReadStream } from "node:fs";

import { z } from "zod";
import { openai } from "../lib/openai";

export async function generateAICompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (req, res) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      temperature: z.number().min(0).max(1).default(0.5),
      prompt: z.string(),
    });

    const { videoId, prompt, temperature } = bodySchema.parse(req.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return res.status(400).send({ error: "video não transcrito e gerado" });
    }

    const prompMessage = prompt.replace("{transcription}", video.transcription);

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature,
      messages: [
        {
          role: "user",
          content: prompMessage,
        },
      ],
      stream: true,
    });

    const stream = OpenAIStream(result);

    streamToResponse(stream, res.raw, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST,PUT,DELETE,OPTIONS",
      },
    });

    // return { result };
  });
}
