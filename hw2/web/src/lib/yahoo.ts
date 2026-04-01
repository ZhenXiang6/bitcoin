import YahooFinance from "yahoo-finance2";
import { DATA_REVALIDATE_SECONDS } from "@/lib/config";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
      meta?: {
        symbol?: string;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

export type YahooClosePoint = {
  date: string;
  close: number;
};

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const yahooFinance = new YahooFinance();

function toDateStringFromSeconds(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function toUnixSeconds(days: number) {
  return Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
}

function buildYahooChartUrl(baseUrl: string, symbol: string, days: number) {
  const url = new URL(`${baseUrl}/v8/finance/chart/${symbol}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("period1", String(toUnixSeconds(days + 40)));
  url.searchParams.set("period2", String(Math.floor(Date.now() / 1000)));
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "history");
  return url.toString();
}

function parseYahooCloseSeries(payload: YahooChartResponse): YahooClosePoint[] {
  const chartError = payload.chart?.error;
  if (chartError) {
    throw new Error(
      `Yahoo chart error: ${chartError.code ?? "unknown"} ${chartError.description ?? ""}`.trim(),
    );
  }

  const firstResult = payload.chart?.result?.[0];
  const timestamps = firstResult?.timestamp ?? [];
  const closes = firstResult?.indicators?.quote?.[0]?.close ?? [];
  if (timestamps.length === 0 || closes.length === 0) {
    throw new Error("Yahoo returned empty chart result for MSTR.");
  }

  const seen = new Set<string>();
  const rows: YahooClosePoint[] = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const seconds = timestamps[index];
    const close = closes[index];
    if (!Number.isFinite(seconds) || typeof close !== "number" || close <= 0) {
      continue;
    }
    const date = toDateStringFromSeconds(seconds);
    if (seen.has(date)) {
      continue;
    }
    seen.add(date);
    rows.push({ date, close });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

type YahooFinance2Quote = {
  date?: Date | string;
  close?: number | null;
};

function normalizeDateInput(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 10);
}

async function getYahooSeriesViaLibrary(symbol: string, days: number) {
  const period1 = new Date(Date.now() - (days + 40) * 24 * 60 * 60 * 1000);
  const period2 = new Date();

  const chart = (await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  })) as { quotes?: YahooFinance2Quote[] };

  const quotes = Array.isArray(chart.quotes) ? chart.quotes : [];
  const seen = new Set<string>();
  const rows: YahooClosePoint[] = [];

  for (const quote of quotes) {
    if (
      (quote.date instanceof Date || typeof quote.date === "string") &&
      typeof quote.close === "number" &&
      Number.isFinite(quote.close) &&
      quote.close > 0
    ) {
      const normalizedDate = normalizeDateInput(quote.date);
      if (seen.has(normalizedDate)) {
        continue;
      }
      seen.add(normalizedDate);
      rows.push({
        date: normalizedDate,
        close: quote.close,
      });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

export async function getYahooHistoricalCloseSeries(
  symbol: string,
  days: number,
): Promise<YahooClosePoint[]> {
  let lastError = "Unknown Yahoo request error";

  try {
    const libraryRows = await getYahooSeriesViaLibrary(symbol, days);
    if (libraryRows.length > 0) {
      return libraryRows;
    }
    lastError = "yahoo-finance2 returned empty quote series.";
  } catch (error) {
    lastError =
      error instanceof Error ? `yahoo-finance2 error: ${error.message}` : "yahoo-finance2 error";
  }

  for (const host of YAHOO_HOSTS) {
    const url = buildYahooChartUrl(host, symbol, days);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      next: { revalidate: DATA_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      const text = await response.text();
      lastError = `Yahoo request failed (${response.status}) via ${host}: ${text}`;
      continue;
    }

    const text = await response.text();
    let payload: YahooChartResponse;
    try {
      payload = JSON.parse(text) as YahooChartResponse;
    } catch {
      lastError = `Yahoo response parse failed via ${host}.`;
      continue;
    }

    try {
      const series = parseYahooCloseSeries(payload);
      if (series.length > 0) {
        return series;
      }
      lastError = `Yahoo returned no valid close points via ${host}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Yahoo parsing error";
    }
  }

  throw new Error(lastError);
}
