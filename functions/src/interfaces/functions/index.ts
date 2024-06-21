import {onRequest} from "firebase-functions/v2/https";
import {parse} from "valibot";
import {storage} from "../../lib/firebase";
import {getPdf} from "../../lib/pptr";
import {PdfQuerySchema} from "./schemas";

const STORE_PATH_PREFIX = "pdfs/";

const CACHE_EXPIRATION = 30; // minutes

export const pdf = onRequest({
  memory: "512MiB",
  maxInstances: 5,
}, async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.type("json");
  const {
    url, storeKey, filename = "file.pdf", ...opts
  } = parse(PdfQuerySchema, req.query);

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

      res.json(file.getSignedUrl({
        action: "read",
        expires: Date.now() + CACHE_EXPIRATION * 60_000, // 30 minutes
      }));

      return;
    }

    const pdf = await getPdf(url, opts);
    res.header("Cache-Control", `public, max-age=${CACHE_EXPIRATION * 60}`);
    res.header("ETag", JSON.stringify(req.query));
    res.header("Content-Disposition", `inline; filename=${filename}`);
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
      metadata: {filename},
    });

    res.json(file.cloudStorageURI);
  } break;

  default:
    res.status(405).send({error: "Method Not Allowed"});
    break;
  }

  return;
});
