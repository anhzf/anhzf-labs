// TODO: Add task queue for browser instances
import type {Browser, PDFOptions} from "puppeteer";
import {launch} from "puppeteer";

const DEFAULT_WAIT_EVENT_TIMEOUT = 45_000;

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

/**
 * Options for generating a PDF using Puppeteer.
 */
interface GetPdfOptions extends PDFOptions {
  /**
   * Wait until the page fires the `window.readyToPrint()`
   * instead of waiting for the network to become idle.
   */
  waitEvent?: boolean;

  /**
   * The timeout (in milliseconds) for waiting for the `waitEvent` to be fired.
   * If the timeout is reached, the page will be forced to print.
   */
  waitEventTimeout?: number;
}

export async function getPdf(url: string, opts?: GetPdfOptions) {
  const browser = await getBrowser();

  const page = await browser.newPage();
  const pending = Promise.race([
    new Promise<void>(
      (resolve) => page.exposeFunction("readyToPrint", resolve),
    ),
    new Promise<void>(
      (resolve) => setTimeout(
        () => {
          resolve();
          console.warn(`Wait event for '${url}' is timed out`);
        },
        opts?.waitEventTimeout || DEFAULT_WAIT_EVENT_TIMEOUT,
      ),
    ),
  ]);

  await page.goto(url, {waitUntil: "networkidle2"});

  if (opts?.waitEvent === true) {
    await pending;
  }

  const pdf = await page.pdf(opts);

  await closeBrowser();

  return pdf;
}
