import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {getPdf} from "../../lib/pptr";

export const pdf = onRequest({
  memory: "512MiB",
  maxInstances: 5,
}, async (req, res) => {
  const {url, ...opts} = req.query;

  if (!URL.canParse(url as string)) {
    throw new HttpsError(
      "invalid-argument", "Invalid ?url"
    );
  }

  const pdf = await getPdf(url as string, opts);
  res.type("application/pdf").send(pdf);
});
