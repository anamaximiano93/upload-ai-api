import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "path";
import fs from "fs";
import util from "util";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { pipeline } from "stream";

const pump = util.promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 25, // 25mb
    },
  });

  app.post("/videos", async (req, res) => {
    const data = await req.file();

    if (!data) {
      return res.status(400).send({ error: "Não veio nada irmão!!" });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return res.status(400).send({ error: "Eu quero o som do video!!" });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;
    const UploadDestination = path.resolve(
      __dirname,
      "../../temp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(UploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: UploadDestination,
      },
    });

    return res.send(video);
  });
}
