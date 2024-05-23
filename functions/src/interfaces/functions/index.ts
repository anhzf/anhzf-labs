import {onRequest} from "firebase-functions/v2/https";
import {parse} from "valibot";
import {getPdf} from "../../lib/pptr";
import {PdfQuerySchema} from "./schemas";

export const pdf = onRequest({
  memory: "512MiB",
  maxInstances: 5,
}, async (req, res) => {
  res.type("json");
  const {url, ...opts} = parse(PdfQuerySchema, req.query);

  const pdf = await getPdf(url, opts);
  res.type("application/pdf").send(pdf);
});
