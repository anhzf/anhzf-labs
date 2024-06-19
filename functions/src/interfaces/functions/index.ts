import {onRequest} from "firebase-functions/v2/https";
import {parse} from "valibot";
import {storage} from "../../lib/firebase";
import {getPdf} from "../../lib/pptr";
import {PdfQuerySchema} from "./schemas";

const STORE_PATH_PREFIX = "pdfs/";

export const pdf = onRequest({
  memory: "512MiB",
  maxInstances: 5,
}, async (req, res) => {
  res.type("json");
  const {url, storeKey, filename, ...opts} = parse(PdfQuerySchema, req.query);

  switch (req.method) {
  case "GET": {
    const key = req.path.split("/").at(-1);
    if (key) {
      const bucket = storage().bucket();
      const file = bucket.file(`${STORE_PATH_PREFIX}${key}`);

      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).send({error: "File not found"});
        return;
      }

      res.header(
        "Content-Disposition",
        `inline; filename="${file.metadata.filename || "file.pdf"}"`
      );
      res.type("application/pdf");

      file.createReadStream().pipe(res)
        .on("error", (err) => res.status(500).send({error: err.message}));

      return;
    }

    const pdf = await getPdf(url, opts);
    res.type("application/pdf").send(pdf);
  } break;

  case "POST": {
    if (!storeKey) {
      res.status(400).send({error: "storeKey is required"});
      return;
    }

    const pdf = await getPdf(url, opts);

    const bucket = storage().bucket();
    const file = bucket.file(`${STORE_PATH_PREFIX}${storeKey}`);

    await file.save(pdf, {
      contentType: "application/pdf",
      metadata: {filename: filename || "file.pdf"},
    });

    res.json(file.cloudStorageURI);
  } break;

  default:
    res.status(405).send({error: "Method Not Allowed"});
    break;
  }

  return;
});
