// TODO: Add task queue for browser instances
import type {Browser, PDFOptions} from "puppeteer";
import {launch} from "puppeteer";

let $: Browser | undefined;

const getBrowser = async () => {
  if (!$) {
    $ = await launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return $;
};

const closeBrowser = async () => {
  if ($) {
    await $.close();
    $ = undefined;
  }
};

interface GetPdfOptions extends PDFOptions {
  waitEvent?: boolean;
}

export async function getPdf(url: string, opts?: GetPdfOptions) {
  const browser = await getBrowser();

  const page = await browser.newPage();
  const pending = new Promise<void>(
    (resolve) => page.exposeFunction("readyToPrint", resolve)
  );

  await page.goto(url, {waitUntil: "networkidle2"});

  if (opts?.waitEvent === true) {
    await pending;
  }

  const pdf = await page.pdf(opts);

  await closeBrowser();

  return pdf;
}
