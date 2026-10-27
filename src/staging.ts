import app from "./worker";
import { budgetPolicy } from "./server/budget-policy";
import { PUBLIC_PATHS } from "./shared/garden";
export { BrowserBudget } from "./server/browser-budget";

type StageEnv = Env & {
  STAGE_SCOPE: string;
  STAGE_URL: string;
  STAGE_VERSION: { id: string };
  STAGE_ASSETS: Fetcher;
};
export default {
  async fetch(request: Request, env: StageEnv): Promise<Response> {
    const url = new URL(request.url);
    let response: Response;
    if (env.STAGE_SCOPE !== "isolated-staging" || url.origin !== env.STAGE_URL)
      response = Response.json(
        { error: "Staging scope is unavailable" },
        { status: 503 },
      );
    else if (url.pathname === "/_stage/metadata" || url.pathname === "/health")
      response = Response.json({
        environmentScope: env.STAGE_SCOPE,
        url: env.STAGE_URL,
        version: env.STAGE_VERSION.id,
        execution: "disabled",
        provider: "stub-only-local-tests",
        sharedProductionBindings: false,
      });
    else if (url.pathname === "/robots.txt")
      response = new Response(
        "User-agent: *\nContent-Signal: search=yes,ai-input=yes,ai-train=no\nDisallow: /\n",
      );
    else if (url.pathname === "/sitemap.xml")
      response = new Response(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
        { headers: { "Content-Type": "application/xml" } },
      );
    else if (url.pathname === "/_stage/check/quota") {
      try {
        budgetPolicy(undefined);
        response = Response.json(
          { error: "Unexpected admission" },
          { status: 500 },
        );
      } catch {
        response = Response.json(
          { error: "Absent quota policy fails closed", providerCalls: 0 },
          { status: 503 },
        );
      }
    } else if (
      (request.method === "GET" || request.method === "HEAD") &&
      PUBLIC_PATHS.includes(url.pathname)
    )
      response = await app.fetch(request);
    else if (
      (request.method === "GET" || request.method === "HEAD") &&
      (url.pathname.startsWith("/assets/") ||
        /\.(?:svg|png|ico|webmanifest)$/.test(url.pathname))
    )
      response = await env.STAGE_ASSETS.fetch(request);
    else
      response = Response.json(
        {
          error: "Paid Browser execution is disabled in staging",
          providerCalls: 0,
        },
        { status: 503 },
      );
    response = new Response(response.body, response);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set(
      "Content-Signal",
      "search=yes,ai-input=yes,ai-train=no",
    );
    response.headers.set("X-Environment-Scope", "isolated-staging");
    response.headers.set("X-Content-Type-Options", "nosniff");
    if (response.headers.get("content-type")?.includes("text/html"))
      response = new HTMLRewriter()
        .on('link[rel="canonical"]', {
          element(element) {
            element.setAttribute("href", `${env.STAGE_URL}${url.pathname}`);
          },
        })
        .on("head", {
          element(element) {
            element.append(
              '<meta name="robots" content="noindex,nofollow"><meta name="environmentScope" content="isolated-staging">',
              { html: true },
            );
          },
        })
        .on("body", {
          element(element) {
            element.prepend(
              `<aside><strong>ISOLATED STAGING</strong> · ${env.STAGE_URL} · Browser execution disabled; provider stubs are local only.</aside>`,
              { html: true },
            );
          },
        })
        .transform(response);
    return request.method === "HEAD" ? new Response(null, response) : response;
  },
} satisfies ExportedHandler<StageEnv>;
